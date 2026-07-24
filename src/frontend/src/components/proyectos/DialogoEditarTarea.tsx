// Edición compartida de una tarea de seguimiento. Todos los cambios pasan
// por una confirmación explícita y quedan sellados en la auditoría local.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { etiquetaBloque } from "@/lib/seguimiento-presupuesto";
import {
  PRIORIDADES_TAREA, registrarModificacionTarea, tituloTarea, usuarioPorId,
  type PrioridadTarea, type Proyecto, type TareaPresupuesto
} from "@/mocks/data";
import type { Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogoConfirmarCambioTarea } from "@/components/proyectos/DialogoConfirmarCambioTarea";
import { SelectorResponsableTarea } from "@/components/proyectos/SelectorResponsableTarea";

interface FormularioEdicion {
  titulo: string;
  itemId: string;
  fechaInicio: string;
  fechaFin: string;
  prioridad: PrioridadTarea;
  responsableId?: string;
}

export function DialogoEditarTarea({
  proyecto,
  tarea,
  usuarioId,
  rol,
  alCerrar,
  alGuardar
}: {
  proyecto?: Proyecto;
  tarea?: TareaPresupuesto;
  usuarioId: string;
  rol: Role;
  alCerrar: () => void;
  alGuardar: (tareaActualizada: TareaPresupuesto) => void;
}) {
  const [formulario, setFormulario] = useState<FormularioEdicion>();
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);

  useEffect(() => {
    if (tarea && proyecto) {
      setFormulario({
        titulo: tituloTarea(tarea, proyecto),
        itemId: tarea.itemId,
        fechaInicio: tarea.fechaInicio ?? "",
        fechaFin: tarea.fechaFin ?? "",
        prioridad: tarea.prioridad ?? "media",
        responsableId: tarea.responsableId
      });
    } else {
      setFormulario(undefined);
      setConfirmacionAbierta(false);
    }
  }, [tarea, proyecto]);

  const validar = () => {
    if (!formulario || !tarea) return;
    const titulo = formulario.titulo.trim();
    if (!titulo) {
      toast("Falta el nombre", { description: "Escribí qué hay que hacer en esta tarea." });
      return;
    }
    if (formulario.fechaInicio && formulario.fechaFin && formulario.fechaFin < formulario.fechaInicio) {
      toast("Revisá las fechas", { description: "La fecha de entrega no puede ser anterior al inicio." });
      return;
    }
    setConfirmacionAbierta(true);
  };

  const guardar = () => {
    if (!formulario || !tarea) return;
    const titulo = formulario.titulo.trim();
    const responsableCambio = formulario.responsableId !== tarea.responsableId;
    const responsable = formulario.responsableId ? usuarioPorId(formulario.responsableId)?.displayName : undefined;
    const fechaAsignacion = responsableCambio ? new Date().toISOString() : tarea.asignadaEn;
    const resumen = responsableCambio
      ? responsable ? `Editó la tarea y la asignó a ${responsable}` : "Editó la tarea y quitó su asignación"
      : "Editó nombre, fechas o prioridad de la tarea";
    alGuardar(registrarModificacionTarea({
      ...tarea,
      titulo,
      itemId: formulario.itemId,
      fechaInicio: formulario.fechaInicio || undefined,
      fechaFin: formulario.fechaFin || undefined,
      prioridad: formulario.prioridad,
      responsableId: formulario.responsableId,
      asignadaPorId: responsableCambio ? usuarioId : tarea.asignadaPorId,
      asignadaEn: fechaAsignacion,
      asignaciones: responsableCambio ? [
        ...(tarea.asignaciones ?? []),
        {
          fecha: fechaAsignacion!,
          asignadoPorId: usuarioId,
          responsableId: formulario.responsableId,
          resumen: responsable ? `Asignó la tarea a ${responsable}` : "Quitó la asignación de la tarea"
        }
      ] : tarea.asignaciones
    }, usuarioId, resumen));
    toast("Tarea actualizada", { description: titulo });
    setConfirmacionAbierta(false);
    alCerrar();
  };

  return (
    <>
      <Dialog open={Boolean(tarea && formulario)} onOpenChange={(abierto) => !abierto && alCerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
            <DialogDescription>
              {tarea ? etiquetaBloque(tarea.grupo, tarea.tipoProducto) : ""}
            </DialogDescription>
          </DialogHeader>
          {formulario && tarea && proyecto && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titulo-tarea-editar">Nombre de la tarea *</Label>
                <Input
                  id="titulo-tarea-editar"
                  value={formulario.titulo}
                  onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Componente del presupuesto (opcional)</Label>
                <Select
                  value={formulario.itemId || "ninguno"}
                  onValueChange={(valor) => setFormulario({ ...formulario, itemId: valor === "ninguno" ? "" : valor })}
                >
                  <SelectTrigger className="w-full" aria-label="Componente del presupuesto"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin componente asociado</SelectItem>
                    {(proyecto.presupuestoEjecutivo?.items ?? [])
                      .filter((item) => item.tipoProducto === tarea.tipoProducto)
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
                  <SelectTrigger className="w-full" aria-label="Prioridad de la tarea"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES_TAREA.map((prioridad) => (
                      <SelectItem key={prioridad} value={prioridad}><span className="capitalize">{prioridad}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Solo administradores y supervisores pueden definirla.</p>
              </div>
              <SelectorResponsableTarea
                rol={rol}
                proyectoId={proyecto?.id}
                valor={formulario.responsableId}
                onChange={(responsableId) => setFormulario({ ...formulario, responsableId })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-inicio-tarea-editar">Fecha de inicio</Label>
                  <Input id="fecha-inicio-tarea-editar" type="date" value={formulario.fechaInicio} onChange={(evento) => setFormulario({ ...formulario, fechaInicio: evento.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha-fin-tarea-editar">Fecha de entrega</Label>
                  <Input id="fecha-fin-tarea-editar" type="date" value={formulario.fechaFin} onChange={(evento) => setFormulario({ ...formulario, fechaFin: evento.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={alCerrar}>Cancelar</Button>
            <Button onClick={validar}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DialogoConfirmarCambioTarea
        abierto={confirmacionAbierta}
        titulo="¿Estás seguro de hacer este cambio?"
        descripcion="Se registrará quién modificó la tarea, qué cambió y el momento de la operación."
        alCancelar={() => setConfirmacionAbierta(false)}
        alConfirmar={guardar}
      />
    </>
  );
}
