// Tablero por estado (planificadas / en progreso / pausadas / finalizadas).
// Mover un proyecto entre columnas está condicionado:
//  - a "En progreso": solo si ya tiene algún avance registrado
//  - a "Pausada": exige registrar el motivo de la pausa
//  - a "Finalizada": advierte que todo el avance se guarda al 100% y
//    exige al menos una evidencia (existente o adjuntada en el momento)
import { useState } from "react";
import { Link } from "react-router";
import { ArrowRightLeft, CircleAlert, ImagePlus, MapPin, PauseCircle, PlayCircle, Flag } from "lucide-react";
import { toast } from "sonner";
import { prepararEvidencia } from "@/lib/evidencias";
import { formatFecha } from "@/lib/format";
import {
  avanceGeneral, clientePorId, contarEvidencias, nombreTipoProducto, proyectoTieneAvance,
  type EstadoObra, type Proyecto
} from "@/mocks/data";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const COLUMNAS: { estado: EstadoObra; titulo: string; descripcion: string }[] = [
  { estado: "planificada", titulo: "Planificadas", descripcion: "Creadas, sin avance todavía" },
  { estado: "en_progreso", titulo: "En progreso", descripcion: "Con avance registrado" },
  { estado: "pausada", titulo: "Pausadas", descripcion: "Detenidas con motivo" },
  { estado: "finalizada", titulo: "Finalizadas", descripcion: "Cerradas al 100%" }
];

type Movimiento =
  | { tipo: "bloqueado"; proyecto: Proyecto }
  | { tipo: "pausa"; proyecto: Proyecto }
  | { tipo: "cierre"; proyecto: Proyecto }
  | { tipo: "directo"; proyecto: Proyecto; destino: EstadoObra };

export function TableroProyectos({
  proyectos,
  puedeMover,
  usuarioId,
  alGuardar
}: {
  proyectos: Proyecto[];
  puedeMover: boolean;
  usuarioId: string;
  alGuardar: (proyecto: Proyecto) => void;
}) {
  const [movimiento, setMovimiento] = useState<Movimiento>();
  const [motivoPausa, setMotivoPausa] = useState("");
  const [archivoCierre, setArchivoCierre] = useState<File>();
  const [guardando, setGuardando] = useState(false);
  const hoy = new Date().toISOString().slice(0, 10);

  const cerrarDialogo = () => {
    setMovimiento(undefined);
    setMotivoPausa("");
    setArchivoCierre(undefined);
  };

  const pedirMovimiento = (proyecto: Proyecto, destino: EstadoObra) => {
    if (destino === proyecto.estado) return;
    if (destino === "en_progreso" && !proyectoTieneAvance(proyecto)) {
      setMovimiento({ tipo: "bloqueado", proyecto });
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
    // Planificada o En progreso (con avance): movimiento directo.
    alGuardar({ ...proyecto, estado: destino });
    toast("Proyecto actualizado", { description: `${proyecto.nombre} → ${COLUMNAS.find((c) => c.estado === destino)?.titulo ?? destino}` });
  };

  const confirmarPausa = () => {
    if (movimiento?.tipo !== "pausa") return;
    const motivo = motivoPausa.trim();
    if (!motivo) {
      toast("Falta el motivo", { description: "Registrá por qué se pausa el proyecto." });
      return;
    }
    alGuardar({
      ...movimiento.proyecto,
      estado: "pausada",
      pausas: [...(movimiento.proyecto.pausas ?? []), { fecha: hoy, usuarioId, motivo }]
    });
    toast("Proyecto pausado", { description: `${movimiento.proyecto.nombre} · ${motivo}` });
    cerrarDialogo();
  };

  const confirmarCierre = async () => {
    if (movimiento?.tipo !== "cierre") return;
    const proyecto = movimiento.proyecto;
    const evidenciasExistentes = contarEvidencias(proyecto);
    if (evidenciasExistentes === 0 && !archivoCierre) {
      toast("Falta la evidencia", { description: "Adjuntá al menos una evidencia general para cerrar el proyecto." });
      return;
    }
    setGuardando(true);
    try {
      const evidenciaGeneral = archivoCierre ? await prepararEvidencia(archivoCierre) : undefined;
      alGuardar({
        ...proyecto,
        estado: "finalizada",
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

  const proyectoEnMovimiento = movimiento?.proyecto;
  const pendientesDelProyecto = proyectoEnMovimiento?.tareasPresupuesto?.filter((tarea) => !tarea.completada) ?? [];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS.map((columna) => {
          const enColumna = proyectos.filter((proyecto) => proyecto.estado === columna.estado);
          return (
            <section key={columna.estado} className="flex min-h-40 flex-col rounded-2xl border bg-muted/30">
              <header className="border-b px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-heading text-sm font-semibold">{columna.titulo}</h2>
                  <span className="cifra text-xs text-muted-foreground">{enColumna.length}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{columna.descripcion}</p>
              </header>
              <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                {enColumna.map((proyecto) => {
                  const ultimaPausa = proyecto.pausas?.at(-1);
                  return (
                    <article key={proyecto.id} className="rounded-xl border bg-card p-3 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/proyectos/${proyecto.id}`} className="min-w-0 font-medium hover:text-primary">
                          <span className="block truncate">{proyecto.nombre}</span>
                        </Link>
                        {puedeMover && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Mover ${proyecto.nombre}`}>
                                <ArrowRightLeft className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs">Mover a</DropdownMenuLabel>
                              {COLUMNAS.filter((c) => c.estado !== proyecto.estado).map((c) => (
                                <DropdownMenuItem key={c.estado} onClick={() => pedirMovimiento(proyecto, c.estado)}>
                                  {c.estado === "en_progreso" && <PlayCircle className="size-4" />}
                                  {c.estado === "pausada" && <PauseCircle className="size-4" />}
                                  {c.estado === "finalizada" && <Flag className="size-4" />}
                                  {c.estado === "planificada" && <ArrowRightLeft className="size-4" />}
                                  {c.titulo}
                                </DropdownMenuItem>
                              ))}
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

                      {columna.estado === "pausada" && ultimaPausa && (
                        <p className="mt-2 rounded-md bg-estado-pausada/10 px-2 py-1 text-[11px] text-estado-pausada">
                          {formatFecha(ultimaPausa.fecha)}: {ultimaPausa.motivo}
                        </p>
                      )}
                    </article>
                  );
                })}
                {enColumna.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin proyectos acá.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bloqueado: falta avance para pasar a En progreso */}
      <Dialog open={movimiento?.tipo === "bloqueado"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-estado-pausada/15 text-estado-pausada">
              <CircleAlert className="size-5" />
            </div>
            <DialogTitle>Todavía no hay avance registrado</DialogTitle>
            <DialogDescription>
              Para pasar «{proyectoEnMovimiento?.nombre}» a <strong>En progreso</strong> tenés que
              completar al menos una tarea de seguimiento con su evidencia. El cambio se hace solo
              al registrar el primer avance.
            </DialogDescription>
          </DialogHeader>
          {pendientesDelProyecto.length > 0 && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Tareas pendientes: <span className="cifra font-semibold text-foreground">{pendientesDelProyecto.length}</span> en
              fábrica e instalación.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Entendido</Button>
            {proyectoEnMovimiento && (
              <Button asChild>
                <Link to={`/proyectos/${proyectoEnMovimiento.id}`}>Ir a las tareas</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pausa: motivo obligatorio */}
      <Dialog open={movimiento?.tipo === "pausa"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-estado-pausada/15 text-estado-pausada">
              <PauseCircle className="size-5" />
            </div>
            <DialogTitle>Pausar proyecto</DialogTitle>
            <DialogDescription>
              «{proyectoEnMovimiento?.nombre}» pasa a <strong>Pausada</strong>. Dejá registrado el
              motivo: queda en el historial del proyecto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-pausa">Motivo de la pausa *</Label>
            <Textarea
              id="motivo-pausa"
              value={motivoPausa}
              onChange={(evento) => setMotivoPausa(evento.target.value)}
              placeholder="Ej. Adenda del cliente: cambio de vidrios en pisos 8 a 12."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button onClick={confirmarPausa}>Pausar proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cierre: advertencia + evidencia general */}
      <Dialog open={movimiento?.tipo === "cierre"} onOpenChange={(abierto) => !abierto && cerrarDialogo()}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <CircleAlert className="size-5" />
            </div>
            <DialogTitle>Finalizar proyecto</DialogTitle>
            <DialogDescription>
              Al finalizar «{proyectoEnMovimiento?.nombre}», <strong>todos los avances se guardan
              como 100% hechos</strong> ({pendientesDelProyecto.length} tareas pendientes se marcarán
              completadas). Esta acción queda registrada con tu usuario.
            </DialogDescription>
          </DialogHeader>
          {proyectoEnMovimiento && contarEvidencias(proyectoEnMovimiento) === 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="evidencia-cierre" className="flex items-center gap-1.5">
                <ImagePlus className="size-4" /> Evidencia general del cierre *
              </Label>
              <Input
                id="evidencia-cierre"
                type="file"
                accept="image/*"
                onChange={(evento) => setArchivoCierre(evento.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                El proyecto no tiene ninguna evidencia cargada: adjuntá al menos una para poder cerrarlo.
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Evidencias ya cargadas en el proyecto:{" "}
              <span className="cifra font-semibold text-foreground">
                {proyectoEnMovimiento ? contarEvidencias(proyectoEnMovimiento) : 0}
              </span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cerrarDialogo}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void confirmarCierre()} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar y finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
