import { useState, type CSSProperties } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { Link } from "react-router";
import {
  ArrowRightLeft,
  Ban,
  CircleAlert,
  Flag,
  GripVertical,
  ImagePlus,
  MapPin,
  PauseCircle,
  PlayCircle,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { prepararEvidencia } from "@/lib/evidencias";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  avanceGeneral,
  clientePorId,
  contarEvidencias,
  nombreTipoProducto,
  proyectoTieneAvance,
  registrarCambioEstado,
  type EstadoObra,
  type Proyecto
} from "@/mocks/data";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EstadoTablero = Exclude<EstadoObra, "cancelada">;

const COLUMNAS: { estado: EstadoTablero; titulo: string; descripcion: string }[] = [
  { estado: "planificada", titulo: "Planificadas", descripcion: "Creadas, sin avance todavía" },
  { estado: "en_progreso", titulo: "En progreso", descripcion: "Con avance registrado" },
  { estado: "pausada", titulo: "Pausadas", descripcion: "Detenidas con motivo" },
  { estado: "finalizada", titulo: "Finalizadas", descripcion: "Cerradas al 100%" }
];

const TITULOS_ESTADO: Record<EstadoObra, string> = {
  planificada: "Planificada",
  en_progreso: "En progreso",
  pausada: "Pausada",
  finalizada: "Finalizada",
  cancelada: "Cancelada"
};

type Movimiento =
  | { tipo: "bloqueado_sin_avance"; proyecto: Proyecto }
  | { tipo: "bloqueado_con_avance"; proyecto: Proyecto }
  | { tipo: "confirmacion"; proyecto: Proyecto; destino: EstadoTablero }
  | { tipo: "pausa"; proyecto: Proyecto }
  | { tipo: "reanudacion"; proyecto: Proyecto }
  | { tipo: "cierre"; proyecto: Proyecto }
  | { tipo: "cancelacion"; proyecto: Proyecto }
  | { tipo: "reactivacion"; proyecto: Proyecto }
  | { tipo: "reapertura"; proyecto: Proyecto };

function ColumnaTablero({
  estado,
  titulo,
  descripcion,
  cantidad,
  children
}: {
  estado: EstadoTablero;
  titulo: string;
  descripcion: string;
  cantidad: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: estado });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[28rem] w-[min(82vw,20rem)] shrink-0 flex-col rounded-2xl border bg-muted/30 transition-colors sm:w-80",
        isOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      <header className="border-b px-4 py-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-sm font-semibold">{titulo}</h2>
          <span className="cifra text-xs text-muted-foreground">{cantidad}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{descripcion}</p>
      </header>
      <div className="flex flex-1 flex-col gap-2.5 p-2.5">{children}</div>
    </section>
  );
}

function TarjetaProyecto({
  proyecto,
  puedeMover,
  puedeCancelar,
  puedeReabrir,
  alPedirMovimiento,
  alCancelar,
  alReabrir
}: {
  proyecto: Proyecto;
  puedeMover: boolean;
  puedeCancelar: boolean;
  puedeReabrir: boolean;
  alPedirMovimiento: (proyecto: Proyecto, destino: EstadoTablero) => void;
  alCancelar: (proyecto: Proyecto) => void;
  alReabrir: (proyecto: Proyecto) => void;
}) {
  const arrastrable = puedeMover && proyecto.estado !== "finalizada";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: proyecto.id,
    disabled: !arrastrable
  });
  const estilo: CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const ultimaPausa = proyecto.pausas?.at(-1);

  return (
    <article
      ref={setNodeRef}
      style={estilo}
      className={cn(
        "relative rounded-xl border bg-card p-3 shadow-xs transition-[box-shadow,opacity]",
        isDragging && "z-50 opacity-80 shadow-xl ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-1.5">
        {arrastrable && (
          <button
            type="button"
            className="mt-0.5 grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={`Arrastrar ${proyecto.nombre}`}
            title="Arrastrar para cambiar de estado"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <Link to={`/proyectos/${proyecto.id}`} className="min-w-0 flex-1 font-medium hover:text-primary">
          <span className="block truncate">{proyecto.nombre}</span>
        </Link>
        {((proyecto.estado === "finalizada" && puedeReabrir) || (proyecto.estado !== "finalizada" && puedeMover)) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Acciones de ${proyecto.nombre}`}>
                <ArrowRightLeft className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {proyecto.estado === "finalizada" ? (
                puedeReabrir && (
                  <DropdownMenuItem onClick={() => alReabrir(proyecto)}>
                    <RotateCcw className="size-4" /> Reabrir proyecto
                  </DropdownMenuItem>
                )
              ) : (
                <>
                  <DropdownMenuLabel className="text-xs">Mover a</DropdownMenuLabel>
                  {COLUMNAS.filter((columna) => columna.estado !== proyecto.estado && columna.estado !== "finalizada").map((columna) => (
                    <DropdownMenuItem key={columna.estado} onClick={() => alPedirMovimiento(proyecto, columna.estado)}>
                      {columna.estado === "en_progreso" && <PlayCircle className="size-4" />}
                      {columna.estado === "pausada" && <PauseCircle className="size-4" />}
                      {columna.estado === "planificada" && <ArrowRightLeft className="size-4" />}
                      {columna.titulo}
                    </DropdownMenuItem>
                  ))}
                  {puedeMover && (
                    <DropdownMenuItem onClick={() => alPedirMovimiento(proyecto, "finalizada")}>
                      <Flag className="size-4" /> Finalizadas
                    </DropdownMenuItem>
                  )}
                  {puedeCancelar && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => alCancelar(proyecto)}>
                        <Ban className="size-4" /> Cancelar proyecto
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3 shrink-0" />
        <span className="truncate">{clientePorId(proyecto.clienteId)?.nombre ?? proyecto.ubicacion}</span>
      </div>

      {(proyecto.productos ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(proyecto.productos ?? []).slice(0, 3).map((producto) => (
            <span key={producto.tipo} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              {nombreTipoProducto(producto.tipo)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5">
        <AvanceMeter valor={avanceGeneral(proyecto)} size="sm" />
      </div>

      {proyecto.estado === "pausada" && ultimaPausa && (
        <p className="mt-2 rounded-md bg-estado-pausada/10 px-2 py-1 text-[11px] text-estado-pausada">
          {formatFecha(ultimaPausa.fecha)}: {ultimaPausa.motivo}
        </p>
      )}
      {proyecto.estado === "finalizada" && (
        <p className="mt-2 text-[11px] text-muted-foreground">La reapertura es una acción especial de administración.</p>
      )}
    </article>
  );
}

export function TableroProyectos({
  proyectos,
  puedeMover,
  puedeCancelar,
  puedeReabrir,
  usuarioId,
  alGuardar
}: {
  proyectos: Proyecto[];
  puedeMover: boolean;
  puedeCancelar: boolean;
  puedeReabrir: boolean;
  usuarioId: string;
  alGuardar: (proyecto: Proyecto) => void;
}) {
  const [movimiento, setMovimiento] = useState<Movimiento>();
  const [motivo, setMotivo] = useState("");
  const [archivoCierre, setArchivoCierre] = useState<File>();
  const [guardando, setGuardando] = useState(false);
  const [proyectoArrastrado, setProyectoArrastrado] = useState<string>();
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );
  const hoy = new Date().toISOString().slice(0, 10);

  const cerrarDialogo = () => {
    setMovimiento(undefined);
    setMotivo("");
    setArchivoCierre(undefined);
  };

  const pedirMovimiento = (proyecto: Proyecto, destino: EstadoTablero) => {
    if (!puedeMover || destino === proyecto.estado || proyecto.estado === "finalizada" || proyecto.estado === "cancelada") return;
    if (destino === "planificada" && proyectoTieneAvance(proyecto)) {
      setMovimiento({ tipo: "bloqueado_con_avance", proyecto });
      return;
    }
    if (destino === "en_progreso" && !proyectoTieneAvance(proyecto)) {
      setMovimiento({ tipo: "bloqueado_sin_avance", proyecto });
      return;
    }
    if (proyecto.estado === "pausada" && destino === "en_progreso") {
      setMovimiento({ tipo: "reanudacion", proyecto });
      return;
    }
    if (destino === "pausada") {
      setMovimiento({ tipo: "pausa", proyecto });
      return;
    }
    if (destino === "finalizada") {
      setMovimiento({ tipo: "cierre", proyecto });
      return;
    }
    setMovimiento({ tipo: "confirmacion", proyecto, destino });
  };

  const alIniciarArrastre = ({ active }: DragStartEvent) => setProyectoArrastrado(String(active.id));
  const alTerminarArrastre = ({ active, over }: DragEndEvent) => {
    setProyectoArrastrado(undefined);
    if (!over) return;
    const proyecto = proyectos.find((item) => item.id === String(active.id));
    const destino = String(over.id) as EstadoTablero;
    if (proyecto && COLUMNAS.some((columna) => columna.estado === destino)) pedirMovimiento(proyecto, destino);
  };

  const confirmarMovimiento = () => {
    if (movimiento?.tipo !== "confirmacion") return;
    const { proyecto, destino } = movimiento;
    alGuardar(registrarCambioEstado(proyecto, destino, usuarioId));
    toast("Estado actualizado", { description: `${proyecto.nombre} → ${TITULOS_ESTADO[destino]}` });
    cerrarDialogo();
  };

  const confirmarPausa = () => {
    if (movimiento?.tipo !== "pausa") return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      toast("Falta el motivo", { description: "Registrá por qué se pausa el proyecto." });
      return;
    }
    const proyectoPausado = registrarCambioEstado(movimiento.proyecto, "pausada", usuarioId, motivoLimpio);
    alGuardar({
      ...proyectoPausado,
      pausas: [...(movimiento.proyecto.pausas ?? []), { fecha: hoy, usuarioId, motivo: motivoLimpio }]
    });
    toast("Proyecto pausado", { description: `${movimiento.proyecto.nombre} · ${motivoLimpio}` });
    cerrarDialogo();
  };

  const confirmarReanudacion = () => {
    if (movimiento?.tipo !== "reanudacion") return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      toast("Falta la observación", { description: "Registrá por qué se reanuda el proyecto." });
      return;
    }
    const ahora = new Date().toISOString();
    const pausas = [...(movimiento.proyecto.pausas ?? [])];
    const indiceAbierto = pausas.findLastIndex((pausa) => !pausa.reanudadaEn);
    if (indiceAbierto >= 0) {
      pausas[indiceAbierto] = {
        ...pausas[indiceAbierto],
        reanudadaEn: ahora,
        reanudadaPorId: usuarioId,
        motivoReanudacion: motivoLimpio
      };
    }
    const reanudado = registrarCambioEstado(movimiento.proyecto, "en_progreso", usuarioId, motivoLimpio);
    alGuardar({ ...reanudado, pausas });
    toast("Proyecto reanudado", { description: movimiento.proyecto.nombre });
    cerrarDialogo();
  };

  const confirmarCierre = async () => {
    if (movimiento?.tipo !== "cierre") return;
    const proyecto = movimiento.proyecto;
    if (contarEvidencias(proyecto) === 0 && !archivoCierre) {
      toast("Falta la evidencia", { description: "Adjuntá al menos una evidencia general para cerrar el proyecto." });
      return;
    }
    setGuardando(true);
    try {
      const evidenciaGeneral = archivoCierre ? await prepararEvidencia(archivoCierre) : undefined;
      const finalizado = registrarCambioEstado(proyecto, "finalizada", usuarioId, "Cierre manual confirmado");
      alGuardar({
        ...finalizado,
        tareasPresupuesto: (proyecto.tareasPresupuesto ?? []).map((tarea) =>
          tarea.completada
            ? tarea
            : { ...tarea, completada: true, completadaEn: new Date().toISOString(), completadaPorId: usuarioId }
        ),
        cierre: { fecha: hoy, usuarioId, evidenciaGeneral }
      });
      toast("Proyecto finalizado", { description: `${proyecto.nombre} · avances guardados al 100%.` });
      cerrarDialogo();
    } catch (error) {
      toast("No se pudo guardar la evidencia", {
        description: error instanceof Error ? error.message : "Probá con otra imagen."
      });
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCancelacion = () => {
    if (movimiento?.tipo !== "cancelacion") return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      toast("Falta el motivo", { description: "Registrá por qué se cancela el proyecto." });
      return;
    }
    const cancelado = registrarCambioEstado(movimiento.proyecto, "cancelada", usuarioId, motivoLimpio);
    alGuardar({
      ...cancelado,
      cancelacion: { fecha: hoy, usuarioId, motivo: motivoLimpio }
    });
    toast("Proyecto cancelado", { description: movimiento.proyecto.nombre });
    cerrarDialogo();
  };

  const confirmarReactivacion = () => {
    if (movimiento?.tipo !== "reactivacion") return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      toast("Falta el motivo", { description: "Registrá por qué se reactiva el proyecto." });
      return;
    }
    const proyecto = movimiento.proyecto;
    const destino: EstadoTablero = proyectoTieneAvance(proyecto) ? "en_progreso" : "planificada";
    const reactivado = registrarCambioEstado(proyecto, destino, usuarioId, motivoLimpio);
    alGuardar({
      ...reactivado,
      cancelacion: proyecto.cancelacion
        ? {
            ...proyecto.cancelacion,
            reactivadaEn: new Date().toISOString(),
            reactivadaPorId: usuarioId,
            motivoReactivacion: motivoLimpio
          }
        : undefined
    });
    toast("Proyecto reactivado", { description: `${proyecto.nombre} → ${TITULOS_ESTADO[destino]}` });
    cerrarDialogo();
  };

  const confirmarReapertura = () => {
    if (movimiento?.tipo !== "reapertura") return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      toast("Falta el motivo", { description: "Registrá por qué se reabre el proyecto." });
      return;
    }
    const proyecto = movimiento.proyecto;
    const reabierto = registrarCambioEstado(proyecto, "en_progreso", usuarioId, motivoLimpio);
    alGuardar({
      ...reabierto,
      cierre: {
        ...(proyecto.cierre ?? { fecha: hoy, usuarioId }),
        reabiertoEn: new Date().toISOString(),
        reabiertoPorId: usuarioId,
        motivoReapertura: motivoLimpio
      }
    });
    toast("Proyecto reabierto", { description: `${proyecto.nombre} → En progreso` });
    cerrarDialogo();
  };

  const proyectoEnMovimiento = movimiento?.proyecto;
  const pendientesDelProyecto = proyectoEnMovimiento?.tareasPresupuesto?.filter((tarea) => !tarea.completada) ?? [];
  const cancelados = proyectos.filter((proyecto) => proyecto.estado === "cancelada");

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <GripVertical className="size-4" />
        Arrastrá una tarjeta por su asa. El cambio se aplica solamente después de confirmar o cumplir su condición.
      </div>

      <DndContext
        sensors={sensores}
        collisionDetection={closestCorners}
        onDragStart={alIniciarArrastre}
        onDragCancel={() => setProyectoArrastrado(undefined)}
        onDragEnd={alTerminarArrastre}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max items-start gap-4">
            {COLUMNAS.map((columna) => {
              const enColumna = proyectos.filter((proyecto) => proyecto.estado === columna.estado);
              return (
                <ColumnaTablero key={columna.estado} {...columna} cantidad={enColumna.length}>
                  {enColumna.map((proyecto) => (
                    <TarjetaProyecto
                      key={proyecto.id}
                      proyecto={proyecto}
                      puedeMover={puedeMover}
                      puedeCancelar={puedeCancelar}
                      puedeReabrir={puedeReabrir}
                      alPedirMovimiento={pedirMovimiento}
                      alCancelar={(item) => setMovimiento({ tipo: "cancelacion", proyecto: item })}
                      alReabrir={(item) => setMovimiento({ tipo: "reapertura", proyecto: item })}
                    />
                  ))}
                  {enColumna.length === 0 && (
                    <div className={cn(
                      "grid min-h-28 place-items-center rounded-xl border border-dashed px-3 text-center text-xs text-muted-foreground",
                      proyectoArrastrado && "bg-background/50"
                    )}>
                      {proyectoArrastrado ? "Soltá acá para solicitar el cambio." : "Sin proyectos acá."}
                    </div>
                  )}
                </ColumnaTablero>
              );
            })}
          </div>
        </div>
      </DndContext>

      {cancelados.length > 0 && (
        <section className="mt-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-sm font-semibold">Proyectos cancelados</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">No forman parte del flujo del tablero. Solo administración puede reactivarlos.</p>
            </div>
            <span className="cifra text-xs text-muted-foreground">{cancelados.length}</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {cancelados.map((proyecto) => (
              <article key={proyecto.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/proyectos/${proyecto.id}`} className="min-w-0 font-medium hover:text-primary">
                    <span className="block truncate">{proyecto.nombre}</span>
                  </Link>
                  {puedeReabrir && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setMovimiento({ tipo: "reactivacion", proyecto })}
                    >
                      <RotateCcw className="size-3.5" /> Reactivar
                    </Button>
                  )}
                </div>
                {proyecto.cancelacion && (
                  <p className="mt-2 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                    {formatFecha(proyecto.cancelacion.fecha)}: {proyecto.cancelacion.motivo}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <Dialog
        open={movimiento?.tipo === "bloqueado_sin_avance" || movimiento?.tipo === "bloqueado_con_avance"}
        onOpenChange={(abierto) => !abierto && cerrarDialogo()}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-estado-pausada/15 text-estado-pausada">
              <CircleAlert className="size-5" />
            </div>
            <DialogTitle>
              {movimiento?.tipo === "bloqueado_con_avance" ? "El proyecto ya tiene avance" : "Todavía no hay avance registrado"}
            </DialogTitle>
            <DialogDescription>
              {movimiento?.tipo === "bloqueado_con_avance" ? (
                <>«{proyectoEnMovimiento?.nombre}» no puede volver a <strong>Planificada</strong> porque ya tiene avance. Podés pausarlo o mantenerlo en progreso.</>
              ) : (
                <>Para pasar «{proyectoEnMovimiento?.nombre}» a <strong>En progreso</strong> tenés que completar al menos una tarea con su evidencia. El primer avance hace el cambio automáticamente.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {movimiento?.tipo === "bloqueado_sin_avance" && pendientesDelProyecto.length > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Tareas pendientes: <span className="cifra font-semibold text-foreground">{pendientesDelProyecto.length}</span> en fábrica e instalación.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Entendido</Button>
            {movimiento?.tipo === "bloqueado_sin_avance" && proyectoEnMovimiento && (
              <Button asChild><Link to={`/proyectos/${proyectoEnMovimiento.id}`}>Ir a las tareas</Link></Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimiento?.tipo === "confirmacion"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ArrowRightLeft className="size-5" />
            </div>
            <DialogTitle>Confirmar cambio de estado</DialogTitle>
            <DialogDescription>
              ¿Querés mover «{proyectoEnMovimiento?.nombre}» de <strong>{proyectoEnMovimiento ? TITULOS_ESTADO[proyectoEnMovimiento.estado] : ""}</strong> a <strong>{movimiento?.tipo === "confirmacion" ? TITULOS_ESTADO[movimiento.destino] : ""}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button onClick={confirmarMovimiento}>Confirmar cambio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimiento?.tipo === "pausa"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-estado-pausada/15 text-estado-pausada"><PauseCircle className="size-5" /></div>
            <DialogTitle>Pausar proyecto</DialogTitle>
            <DialogDescription>«{proyectoEnMovimiento?.nombre}» pasa a <strong>Pausada</strong>. El motivo queda en el historial.</DialogDescription>
          </DialogHeader>
          <CampoMotivo id="motivo-pausa" etiqueta="Motivo de la pausa *" valor={motivo} alCambiar={setMotivo} placeholder="Ej. Adenda del cliente: cambio de vidrios en pisos 8 a 12." />
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button onClick={confirmarPausa}>Pausar proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimiento?.tipo === "reanudacion"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><PlayCircle className="size-5" /></div>
            <DialogTitle>Reanudar proyecto</DialogTitle>
            <DialogDescription>«{proyectoEnMovimiento?.nombre}» vuelve a <strong>En progreso</strong>. Registrá la razón de la reanudación.</DialogDescription>
          </DialogHeader>
          <CampoMotivo id="motivo-reanudacion" etiqueta="Observación de reanudación *" valor={motivo} alCambiar={setMotivo} placeholder="Ej. El cliente aprobó la adenda y se retoman los trabajos." />
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button onClick={confirmarReanudacion}>Reanudar proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimiento?.tipo === "cierre"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive"><CircleAlert className="size-5" /></div>
            <DialogTitle>Finalizar proyecto</DialogTitle>
            <DialogDescription>
              Al finalizar «{proyectoEnMovimiento?.nombre}», <strong>todos los avances se guardan como 100% hechos</strong> ({pendientesDelProyecto.length} tareas pendientes se marcarán completadas). Esta acción queda registrada.
            </DialogDescription>
          </DialogHeader>
          {proyectoEnMovimiento && contarEvidencias(proyectoEnMovimiento) === 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="evidencia-cierre" className="flex items-center gap-1.5"><ImagePlus className="size-4" /> Evidencia general del cierre *</Label>
              <Input id="evidencia-cierre" type="file" accept="image/*" onChange={(evento) => setArchivoCierre(evento.target.files?.[0])} />
              <p className="text-xs text-muted-foreground">El proyecto no tiene evidencia cargada: adjuntá al menos una para poder cerrarlo.</p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Evidencias ya cargadas: <span className="cifra font-semibold text-foreground">{proyectoEnMovimiento ? contarEvidencias(proyectoEnMovimiento) : 0}</span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void confirmarCierre()} disabled={guardando}>{guardando ? "Guardando…" : "Guardar y finalizar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimiento?.tipo === "cancelacion"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive"><Ban className="size-5" /></div>
            <DialogTitle>Cancelar proyecto</DialogTitle>
            <DialogDescription>«{proyectoEnMovimiento?.nombre}» saldrá del flujo operativo. Solo administración podrá reactivarlo.</DialogDescription>
          </DialogHeader>
          <CampoMotivo id="motivo-cancelacion" etiqueta="Motivo de la cancelación *" valor={motivo} alCambiar={setMotivo} placeholder="Explicá por qué se cancela el proyecto." />
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Volver</Button>
            <Button variant="destructive" onClick={confirmarCancelacion}>Cancelar proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movimiento?.tipo === "reactivacion" || movimiento?.tipo === "reapertura"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><RotateCcw className="size-5" /></div>
            <DialogTitle>{movimiento?.tipo === "reactivacion" ? "Reactivar proyecto cancelado" : "Reabrir proyecto finalizado"}</DialogTitle>
            <DialogDescription>
              {movimiento?.tipo === "reactivacion"
                ? `«${proyectoEnMovimiento?.nombre ?? ""}» volverá al flujo según el avance que conserve.`
                : `«${proyectoEnMovimiento?.nombre ?? ""}» volverá a En progreso. Las tareas ya cerradas seguirán completas hasta que se agreguen o reabran tareas.`}
              {" "}La acción y su motivo quedan registrados.
            </DialogDescription>
          </DialogHeader>
          <CampoMotivo id="motivo-recuperacion" etiqueta="Motivo *" valor={motivo} alCambiar={setMotivo} placeholder="Explicá por qué se realiza esta acción excepcional." />
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button onClick={movimiento?.tipo === "reactivacion" ? confirmarReactivacion : confirmarReapertura}>
              {movimiento?.tipo === "reactivacion" ? "Reactivar proyecto" : "Reabrir proyecto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CampoMotivo({
  id,
  etiqueta,
  valor,
  alCambiar,
  placeholder
}: {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Textarea id={id} value={valor} onChange={(evento) => alCambiar(evento.target.value)} placeholder={placeholder} autoFocus />
    </div>
  );
}
