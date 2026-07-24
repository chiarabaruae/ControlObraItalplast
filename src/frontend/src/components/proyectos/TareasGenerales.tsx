// Tareas genéricas del proyecto (D-030): dependen directamente del proyecto,
// sin producto ni etapa de fabricación/instalación. Misma tabla e
// interacciones que Fábrica/Instalación (FilaTarea compartida); acceso
// exclusivo de administración y supervisión.
import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { etiquetaBloque, porcentajeTareas } from "@/lib/seguimiento-presupuesto";
import {
  registrarModificacionTarea, tituloTarea, usuarioPorId, PRIORIDADES_TAREA, TIPO_TAREA_GENERAL,
  type PrioridadTarea, type Proyecto, type TareaPresupuesto
} from "@/mocks/data";
import type { Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TablaTareasSeguimiento } from "@/components/proyectos/SeguimientoPresupuesto";
import { DialogoCompletarTarea } from "@/components/proyectos/DialogoCompletarTarea";
import { DialogoEditarTarea } from "@/components/proyectos/DialogoEditarTarea";
import { DialogoConfirmarCambioTarea } from "@/components/proyectos/DialogoConfirmarCambioTarea";
import { SelectorResponsableTarea } from "@/components/proyectos/SelectorResponsableTarea";

interface FormularioAltaGeneral {
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  prioridad: PrioridadTarea;
  responsableId?: string;
}

export function TareasGenerales({
  proyecto,
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
  const [seleccionada, setSeleccionada] = useState<TareaPresupuesto>();
  const [enEdicion, setEnEdicion] = useState<TareaPresupuesto>();
  const [formulario, setFormulario] = useState<FormularioAltaGeneral>();
  const [tareaParaEliminar, setTareaParaEliminar] = useState<TareaPresupuesto>();

  const tareas = (proyecto.tareasPresupuesto ?? [])
    .filter((tarea) => tarea.grupo === "generales")
    .sort((a, b) => (a.fechaFin ?? "9999").localeCompare(b.fechaFin ?? "9999"));
  const pendientes = tareas.filter((tarea) => !tarea.completada);
  const hechas = tareas.filter((tarea) => tarea.completada);

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
      id: `general-${Date.now()}`,
      itemId: "",
      tipoProducto: TIPO_TAREA_GENERAL,
      grupo: "generales",
      etapa: "Tarea del proyecto",
      titulo,
      fechaInicio: formulario.fechaInicio || undefined,
      fechaFin: formulario.fechaFin || undefined,
      manual: true,
      prioridad: formulario.prioridad,
      responsableId: formulario.responsableId,
      asignadaPorId: formulario.responsableId ? usuarioId : undefined,
      asignadaEn: formulario.responsableId ? ahora : undefined,
      asignaciones: formulario.responsableId
        ? [{ fecha: ahora, asignadoPorId: usuarioId, responsableId: formulario.responsableId, resumen: `Asignó la tarea a ${responsable?.displayName ?? "un usuario"}` }]
        : undefined,
      creadaPorId: usuarioId,
      creadaEn: ahora,
      version: 1,
      completada: false
    });
    toast("Tarea agregada", { description: titulo });
    setFormulario(undefined);
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
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="size-5" /></div>
          <div>
            <h2 className="font-heading font-semibold">Tareas del proyecto</h2>
            <p className="text-xs text-muted-foreground">
              Tareas genéricas del proyecto, independientes de las etapas de fábrica e instalación. Visibles solo para administración y supervisión.
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="cifra text-xl font-bold">{porcentajeTareas(tareas)}%</div>
          <div className="text-xs text-muted-foreground">avance automático</div>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="font-heading text-base">Proyecto · General</CardTitle>
            <div className="flex items-center gap-3">
              <span className="cifra text-sm font-semibold">{porcentajeTareas(tareas)}%</span>
              {puedeEditar && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setFormulario({ titulo: "", fechaInicio: "", fechaFin: "", prioridad: "media", responsableId: undefined })}
                >
                  <Plus className="size-3.5" /> Agregar tarea
                </Button>
              )}
            </div>
          </div>
          <Progress value={porcentajeTareas(tareas)} />
        </CardHeader>
        <CardContent className="px-0">
          {tareas.length > 0 ? (
            <TablaTareasSeguimiento
              proyecto={proyecto}
              tareas={[...pendientes, ...hechas]}
              rol={rol}
              usuarioId={usuarioId}
              puedeEditar={puedeEditar}
              puedeEliminar={puedeEliminar}
              puedePrioridad={puedePrioridad}
              verAuditoria={verAuditoria}
              alSeleccionar={setSeleccionada}
              alEditar={setEnEdicion}
              alEliminar={setTareaParaEliminar}
              alCambiarPrioridad={cambiarPrioridad}
            />
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Sin tareas genéricas. Agregá la primera con "Agregar tarea".
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completar / ver evidencia */}
      <DialogoCompletarTarea
        tarea={seleccionada}
        etiqueta={etiquetaSeleccionada}
        usuarioId={usuarioId}
        alCerrar={() => setSeleccionada(undefined)}
        alGuardar={alActualizar}
        puedeReabrir={puedeEditar}
      />

      {/* Edición: mismo diálogo compartido que el resto del seguimiento */}
      <DialogoEditarTarea
        proyecto={proyecto}
        tarea={enEdicion}
        usuarioId={usuarioId}
        rol={rol}
        alCerrar={() => setEnEdicion(undefined)}
        alGuardar={alActualizar}
      />

      {/* Alta de tarea genérica */}
      <Dialog open={Boolean(formulario)} onOpenChange={(abierto) => !abierto && setFormulario(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea del proyecto</DialogTitle>
            <DialogDescription>Proyecto · General — independiente de fábrica e instalación.</DialogDescription>
          </DialogHeader>
          {formulario && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo-tarea-general">Nombre de la tarea *</Label>
                <Input
                  id="titulo-tarea-general"
                  value={formulario.titulo}
                  onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })}
                  placeholder="Ej. Gestionar permiso municipal de obra"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={formulario.prioridad}
                  onValueChange={(valor) => setFormulario({ ...formulario, prioridad: valor as PrioridadTarea })}
                >
                  <SelectTrigger className="w-full" aria-label="Prioridad de la tarea"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES_TAREA.map((prioridad) => (
                      <SelectItem key={prioridad} value={prioridad}><span className="capitalize">{prioridad}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SelectorResponsableTarea
                rol={rol}
                proyectoId={proyecto.id}
                valor={formulario.responsableId}
                onChange={(responsableId) => setFormulario({ ...formulario, responsableId })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-inicio-tarea-general">Fecha de inicio</Label>
                  <Input
                    id="fecha-inicio-tarea-general"
                    type="date"
                    value={formulario.fechaInicio}
                    onChange={(evento) => setFormulario({ ...formulario, fechaInicio: evento.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-fin-tarea-general">Fecha de entrega</Label>
                  <Input
                    id="fecha-fin-tarea-general"
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
