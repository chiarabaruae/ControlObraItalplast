// Seguimiento por presupuesto en modo LISTA (no matriz):
// cada bloque (premarcos / producto) muestra sus tareas como filas con
// fechas de entrega. El supervisor puede agregar tareas nuevas, renombrar,
// cambiar fechas o eliminar. Completar exige evidencia fotográfica.
// Mismos campos y condiciones por rol que la sección Tareas: prioridad
// editable, auditoría solo para administradores, y el mismo diálogo de edición.
import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Check, Factory, HardHat, History, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { etiquetaBloque, porcentajeTareas } from "@/lib/seguimiento-presupuesto";
import { formatFechaCorta, formatFechaHora } from "@/lib/format";
import {
  nombreTipoProducto, registrarModificacionTarea, tituloTarea, usuarioPorId, usuarioConAvatarPorId, PRIORIDADES_TAREA,
  type GrupoTareaPresupuesto, type PrioridadTarea, type Proyecto, type TareaPresupuesto, type TipoProducto
} from "@/mocks/data";
import { permisos, type Role } from "@/lib/roles";
import { UserAvatar } from "@/components/app/UserAvatar";
import { PrioridadBadge } from "@/components/app/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogoCompletarTarea } from "@/components/proyectos/DialogoCompletarTarea";
import { DialogoEditarTarea } from "@/components/proyectos/DialogoEditarTarea";
import { DialogoConfirmarCambioTarea } from "@/components/proyectos/DialogoConfirmarCambioTarea";
import { SelectorResponsableTarea } from "@/components/proyectos/SelectorResponsableTarea";

const GRUPOS_FABRICA: GrupoTareaPresupuesto[] = ["fabricacion_premarcos", "fabrica"];
const GRUPOS_INSTALACION: GrupoTareaPresupuesto[] = ["instalacion_premarcos", "instalacion"];

interface FormularioAlta {
  grupo: GrupoTareaPresupuesto;
  tipoProducto: TipoProducto;
  titulo: string;
  itemId: string;
  fechaInicio: string;
  fechaFin: string;
  prioridad: PrioridadTarea;
  responsableId?: string;
}

/** Etiqueta compacta para metadatos secundarios (ítem, responsable, auditoría). */
function MetaChip({
  icono: Icono,
  children,
  title
}: {
  icono?: typeof CalendarDays;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] leading-normal text-muted-foreground"
      title={title}
    >
      {Icono && <Icono className="size-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

function FilaTarea({
  proyecto,
  tarea,
  puedeCompletar,
  puedeEditar,
  puedeEliminar,
  puedePrioridad,
  verAuditoria,
  alSeleccionar,
  alEditar,
  alEliminar,
  alCambiarPrioridad
}: {
  proyecto: Proyecto;
  tarea: TareaPresupuesto;
  puedeCompletar: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  puedePrioridad: boolean;
  verAuditoria: boolean;
  alSeleccionar: (tarea: TareaPresupuesto) => void;
  alEditar: (tarea: TareaPresupuesto) => void;
  alEliminar: (tarea: TareaPresupuesto) => void;
  alCambiarPrioridad: (tarea: TareaPresupuesto, prioridad: PrioridadTarea) => void;
}) {
  const item = proyecto.presupuestoEjecutivo?.items.find((actual) => actual.id === tarea.itemId);
  const titulo = tituloTarea(tarea, proyecto);
  const rangoFechas = tarea.fechaInicio || tarea.fechaFin
    ? `${tarea.fechaInicio ? formatFechaCorta(tarea.fechaInicio) : "…"} → ${tarea.fechaFin ? formatFechaCorta(tarea.fechaFin) : "…"}`
    : null;

  const responsable = tarea.responsableId ? usuarioPorId(tarea.responsableId) : undefined;
  const asignadaPor = tarea.asignadaPorId ? usuarioPorId(tarea.asignadaPorId)?.displayName : undefined;
  const tituloResponsable = responsable
    ? `Responsable: ${responsable.displayName}${asignadaPor ? ` · Asignada por ${asignadaPor}` : ""}`
    : undefined;

  const tituloAuditoria = verAuditoria
    ? [
        tarea.creadaEn ? `Creada ${formatFechaHora(tarea.creadaEn)}` : null,
        tarea.modificadaEn
          ? `Modificada ${formatFechaHora(tarea.modificadaEn)} por ${usuarioPorId(tarea.modificadaPorId ?? "")?.displayName ?? "—"}`
          : null
      ].filter(Boolean).join(" · ")
    : undefined;

  return (
    <li className={`grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1.5 px-4 py-3 ${tarea.completada ? "opacity-60" : ""}`}>
      <Button
        type="button"
        variant={tarea.completada ? "default" : "outline"}
        size="icon"
        className="row-span-2 size-8 shrink-0 self-start rounded-full"
        onClick={() => alSeleccionar(tarea)}
        disabled={!puedeCompletar && !tarea.completada}
        aria-label={`${tarea.completada ? "Ver evidencia de" : "Completar"} ${titulo}`}
      >
        <Check className="size-4" />
      </Button>

      {/* Fila 1: identidad de la tarea + controles primarios (prioridad, editar, eliminar). */}
      <div className="flex min-w-0 items-center gap-2">
        <span className={`min-w-0 truncate text-sm font-medium ${tarea.completada ? "line-through" : ""}`}>
          {titulo}
        </span>
        {tarea.manual && (
          <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
            Agregada
          </span>
        )}

        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {puedePrioridad ? (
            <Select value={tarea.prioridad ?? "media"} onValueChange={(valor) => alCambiarPrioridad(tarea, valor as PrioridadTarea)}>
              <SelectTrigger className="h-7 w-28 shrink-0 text-xs" aria-label={`Prioridad de ${titulo}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADES_TAREA.map((p) => (
                  <SelectItem key={p} value={p}><span className="capitalize">{p}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <PrioridadBadge prioridad={tarea.prioridad ?? "media"} />
          )}

          {puedeEditar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => alEditar(tarea)}
              aria-label={`Editar ${titulo}`}
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
          {puedeEliminar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive"
              onClick={() => alEliminar(tarea)}
              aria-label={`Eliminar ${titulo}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </span>
      </div>

      {/* Fila 2: metadatos secundarios como chips + fechas, separados de los controles. */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {item && <MetaChip>{item.ambiente || item.descripcion} · {item.cantidad} un.</MetaChip>}
        {responsable && (
          <MetaChip title={tituloResponsable}>
            <span className="inline-flex items-center gap-1">
              {usuarioConAvatarPorId(tarea.responsableId!) && (
                <UserAvatar
                  user={usuarioConAvatarPorId(tarea.responsableId!)!}
                  className="size-4"
                  fallbackClassName="text-[8px]"
                />
              )}
              {responsable.displayName}
            </span>
          </MetaChip>
        )}
        {verAuditoria && tarea.modificadaEn && (
          <MetaChip icono={History} title={tituloAuditoria}>
            v{tarea.version ?? 1} · {usuarioPorId(tarea.modificadaPorId ?? "")?.displayName ?? "—"}
          </MetaChip>
        )}

        {rangoFechas && (
          <span className="cifra ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" /> {rangoFechas}
          </span>
        )}
      </div>
    </li>
  );
}

export function SeguimientoPresupuesto({
  proyecto,
  lado,
  puedeEditar,
  puedeEliminar,
  puedePrioridad,
  verAuditoria,
  usuarioId,
  rol,
  alActualizar,
  alAgregar,
  alEliminarTarea
}: {
  proyecto: Proyecto;
  lado: "fabrica" | "instalacion";
  puedeEditar: boolean;
  puedeEliminar: boolean;
  puedePrioridad: boolean;
  verAuditoria: boolean;
  usuarioId: string;
  rol: Role;
  alActualizar: (tarea: TareaPresupuesto) => void;
  alAgregar: (tarea: TareaPresupuesto) => void;
  alEliminarTarea: (tarea: TareaPresupuesto) => void;
}) {
  const grupos = lado === "fabrica" ? GRUPOS_FABRICA : GRUPOS_INSTALACION;
  const Icono = lado === "fabrica" ? Factory : HardHat;
  const [seleccionada, setSeleccionada] = useState<TareaPresupuesto>();
  const [enEdicion, setEnEdicion] = useState<TareaPresupuesto>();
  const [formulario, setFormulario] = useState<FormularioAlta>();
  const [tareaParaEliminar, setTareaParaEliminar] = useState<TareaPresupuesto>();
  const productos = useMemo(
    () => proyecto.productos?.filter((producto) => producto.tipo !== "servicios") ?? [],
    [proyecto.productos]
  );
  const tareas = (proyecto.tareasPresupuesto ?? []).filter((tarea) => rol !== "viewer" || tarea.responsableId === usuarioId);

  const guardarAlta = () => {
    if (!formulario) return;
    const titulo = formulario.titulo.trim();
    if (!titulo) {
      toast("Falta el nombre", { description: "Escribí qué hay que hacer en esta tarea." });
      return;
    }
    if (formulario.fechaInicio && formulario.fechaFin && formulario.fechaFin < formulario.fechaInicio) {
      toast("Revisá las fechas", { description: "La fecha de entrega no puede ser anterior al inicio." });
      return;
    }
    const ahora = new Date().toISOString();
    const responsable = formulario.responsableId ? usuarioPorId(formulario.responsableId) : undefined;
    alAgregar({
      id: `manual-${Date.now()}`,
      itemId: formulario.itemId,
      tipoProducto: formulario.tipoProducto,
      grupo: formulario.grupo,
      etapa: "Tarea agregada",
      titulo,
      fechaInicio: formulario.fechaInicio || undefined,
      fechaFin: formulario.fechaFin || undefined,
      manual: true,
      prioridad: formulario.prioridad,
      responsableId: formulario.responsableId,
      asignadaPorId: formulario.responsableId ? usuarioId : undefined,
      asignadaEn: formulario.responsableId ? ahora : undefined,
      asignaciones: formulario.responsableId ? [{ fecha: ahora, asignadoPorId: usuarioId, responsableId: formulario.responsableId, resumen: `Asignó la tarea a ${responsable?.displayName ?? "un usuario"}` }] : undefined,
      creadaPorId: usuarioId,
      creadaEn: ahora,
      version: 1,
      completada: false
    });
    toast("Tarea agregada", { description: titulo });
    setFormulario(undefined);
  };

  const eliminar = (tarea: TareaPresupuesto) => {
    setTareaParaEliminar(tarea);
  };

  const confirmarEliminar = () => {
    if (!tareaParaEliminar) return;
    alEliminarTarea(tareaParaEliminar);
    toast("Tarea archivada", { description: tituloTarea(tareaParaEliminar, proyecto) });
    setTareaParaEliminar(undefined);
  };

  const cambiarPrioridad = (tarea: TareaPresupuesto, prioridad: PrioridadTarea) => {
    if (prioridad === (tarea.prioridad ?? "media")) return;
    alActualizar(registrarModificacionTarea({ ...tarea, prioridad }, usuarioId, `Cambió la prioridad a ${prioridad}`));
  };

  const etiquetaSeleccionada = seleccionada
    ? `${tituloTarea(seleccionada, proyecto)} · ${etiquetaBloque(seleccionada.grupo, seleccionada.tipoProducto)}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icono className="size-5" /></div>
          <div>
            <h2 className="font-heading font-semibold">Seguimiento de {lado === "fabrica" ? "fábrica" : "instalación"}</h2>
            <p className="text-xs text-muted-foreground">Cada tarea exige evidencia fotográfica para quedar completada.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="cifra text-xl font-bold">{porcentajeTareas(tareas, grupos)}%</div>
          <div className="text-xs text-muted-foreground">avance automático</div>
        </div>
      </div>

      {productos.map((producto) => {
        const gruposDelProducto = grupos.filter((grupo) =>
          tareas.some((tarea) => tarea.tipoProducto === producto.tipo && tarea.grupo === grupo)
        );
        if (gruposDelProducto.length === 0) return null;

        return (
          <section key={producto.tipo} className="space-y-3">
            <div>
              <div className="senal">Producto</div>
              <h3 className="mt-1 font-heading text-lg font-semibold">{nombreTipoProducto(producto.tipo)}</h3>
            </div>

            {gruposDelProducto.map((grupo) => {
              const tareasGrupo = tareas
                .filter((tarea) => tarea.tipoProducto === producto.tipo && tarea.grupo === grupo)
                .sort((a, b) => (a.fechaFin ?? "9999").localeCompare(b.fechaFin ?? "9999"));
              const pendientes = tareasGrupo.filter((tarea) => !tarea.completada);
              const hechas = tareasGrupo.filter((tarea) => tarea.completada);

              return (
                <Card key={`${producto.tipo}-${grupo}`}>
                  <CardHeader className="gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="font-heading text-base">{etiquetaBloque(grupo, producto.tipo)}</CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="cifra text-sm font-semibold">{porcentajeTareas(tareasGrupo)}%</span>
                        {puedeEditar && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => setFormulario({
                              grupo,
                              tipoProducto: producto.tipo,
                              titulo: "",
                              itemId: "",
                              fechaInicio: "",
                              fechaFin: "",
                              prioridad: "media",
                              responsableId: undefined
                            })}
                          >
                            <Plus className="size-3.5" /> Agregar tarea
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress value={porcentajeTareas(tareasGrupo)} />
                  </CardHeader>
                  <CardContent className="px-0">
                    <ul className="divide-y">
                      {[...pendientes, ...hechas].map((tarea) => (
                        <FilaTarea
                          key={tarea.id}
                          proyecto={proyecto}
                          tarea={tarea}
                          puedeCompletar={permisos.completarTarea(rol, tarea.responsableId === usuarioId)}
                          puedeEditar={puedeEditar}
                          puedeEliminar={puedeEliminar}
                          puedePrioridad={puedePrioridad}
                          verAuditoria={verAuditoria}
                          alSeleccionar={setSeleccionada}
                          alEditar={setEnEdicion}
                          alEliminar={eliminar}
                          alCambiarPrioridad={cambiarPrioridad}
                        />
                      ))}
                    </ul>
                    {tareasGrupo.length === 0 && (
                      <p className="px-4 py-6 text-sm text-muted-foreground">Sin tareas en este bloque.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        );
      })}

      {/* Completar / ver evidencia */}
      <DialogoCompletarTarea
        tarea={seleccionada}
        etiqueta={etiquetaSeleccionada}
        usuarioId={usuarioId}
        alCerrar={() => setSeleccionada(undefined)}
        alGuardar={alActualizar}
        puedeReabrir={Boolean(seleccionada && permisos.completarTarea(rol, seleccionada.responsableId === usuarioId))}
      />

      {/* Edición de una tarea existente: mismo diálogo que la sección Tareas */}
      <DialogoEditarTarea
        proyecto={proyecto}
        tarea={enEdicion}
        usuarioId={usuarioId}
        rol={rol}
        alCerrar={() => setEnEdicion(undefined)}
        alGuardar={alActualizar}
      />

      {/* Alta de tarea manual dentro del bloque */}
      <Dialog open={Boolean(formulario)} onOpenChange={(abierto) => !abierto && setFormulario(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea de seguimiento</DialogTitle>
            <DialogDescription>
              {formulario ? etiquetaBloque(formulario.grupo, formulario.tipoProducto) : ""}
            </DialogDescription>
          </DialogHeader>
          {formulario && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo-tarea">Nombre de la tarea *</Label>
                <Input
                  id="titulo-tarea"
                  value={formulario.titulo}
                  onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })}
                  placeholder="Ej. Verificar plomo de premarcos piso 3"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Componente del presupuesto (opcional)</Label>
                <Select
                  value={formulario.itemId || "ninguno"}
                  onValueChange={(valor) => setFormulario({ ...formulario, itemId: valor === "ninguno" ? "" : valor })}
                >
                  <SelectTrigger className="w-full" aria-label="Componente del presupuesto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin componente asociado</SelectItem>
                    {(proyecto.presupuestoEjecutivo?.items ?? [])
                      .filter((item) => item.tipoProducto === formulario.tipoProducto)
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {(item.codigo || `Pos. ${item.posicion}`)} · {item.ambiente || item.descripcion}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={formulario.prioridad}
                  onValueChange={(valor) => setFormulario({ ...formulario, prioridad: valor as PrioridadTarea })}
                >
                  <SelectTrigger className="w-full" aria-label="Prioridad de la tarea">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES_TAREA.map((prioridad) => (
                      <SelectItem key={prioridad} value={prioridad}>
                        <span className="capitalize">{prioridad}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo administradores y supervisores pueden definirla.
                </p>
              </div>
              <SelectorResponsableTarea
                rol={rol}
                valor={formulario.responsableId}
                onChange={(responsableId) => setFormulario({ ...formulario, responsableId })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-inicio-tarea">Fecha de inicio</Label>
                  <Input
                    id="fecha-inicio-tarea"
                    type="date"
                    value={formulario.fechaInicio}
                    onChange={(evento) => setFormulario({ ...formulario, fechaInicio: evento.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-fin-tarea">Fecha de entrega</Label>
                  <Input
                    id="fecha-fin-tarea"
                    type="date"
                    value={formulario.fechaFin}
                    onChange={(evento) => setFormulario({ ...formulario, fechaFin: evento.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormulario(undefined)}>Cancelar</Button>
            <Button onClick={guardarAlta}>Agregar tarea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DialogoConfirmarCambioTarea
        abierto={Boolean(tareaParaEliminar)}
        titulo="¿Estás seguro de hacer este cambio?"
        descripcion="La tarea se archivará y la operación quedará registrada para administración."
        etiquetaConfirmar="Archivar tarea"
        variante="destructive"
        alCancelar={() => setTareaParaEliminar(undefined)}
        alConfirmar={confirmarEliminar}
      />
    </div>
  );
}
