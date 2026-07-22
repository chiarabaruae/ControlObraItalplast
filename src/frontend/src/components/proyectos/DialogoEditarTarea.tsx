// Edición de una tarea de seguimiento existente (nombre, componente, prioridad
// y fechas). Componente compartido: la sección Tareas y el detalle de proyecto
// usan el mismo diálogo para garantizar los mismos campos y reglas.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { etiquetaBloque } from "@/lib/seguimiento-presupuesto";
import {
  PRIORIDADES_TAREA, registrarModificacionTarea, tituloTarea,
  type PrioridadTarea, type Proyecto, type TareaPresupuesto
} from "@/mocks/data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormularioEdicion {
  titulo: string;
  itemId: string;
  fechaInicio: string;
  fechaFin: string;
  prioridad: PrioridadTarea;
}

export function DialogoEditarTarea({
  proyecto,
  tarea,
  usuarioId,
  alCerrar,
  alGuardar
}: {
  proyecto?: Proyecto;
  tarea?: TareaPresupuesto;
  usuarioId: string;
  alCerrar: () => void;
  alGuardar: (tareaActualizada: TareaPresupuesto) => void;
}) {
  const [formulario, setFormulario] = useState<FormularioEdicion>();

  useEffect(() => {
    if (tarea && proyecto) {
      setFormulario({
        titulo: tituloTarea(tarea, proyecto),
        itemId: tarea.itemId,
        fechaInicio: tarea.fechaInicio ?? "",
        fechaFin: tarea.fechaFin ?? "",
        prioridad: tarea.prioridad ?? "media"
      });
    } else {
      setFormulario(undefined);
    }
  }, [tarea, proyecto]);

  const guardar = () => {
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
    alGuardar(registrarModificacionTarea({
      ...tarea,
      titulo,
      itemId: formulario.itemId,
      fechaInicio: formulario.fechaInicio || undefined,
      fechaFin: formulario.fechaFin || undefined,
      prioridad: formulario.prioridad
    }, usuarioId, "Editó nombre, fechas o prioridad de la tarea"));
    toast("Tarea actualizada", { description: titulo });
    alCerrar();
  };

  return (
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
                <SelectTrigger className="w-full" aria-label="Componente del presupuesto">
                  <SelectValue />
                </SelectTrigger>
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
              <p className="text-xs text-muted-foreground">Solo administradores y supervisores pueden definirla.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fecha-inicio-tarea-editar">Fecha de inicio</Label>
                <Input
                  id="fecha-inicio-tarea-editar"
                  type="date"
                  value={formulario.fechaInicio}
                  onChange={(evento) => setFormulario({ ...formulario, fechaInicio: evento.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha-fin-tarea-editar">Fecha de entrega</Label>
                <Input
                  id="fecha-fin-tarea-editar"
                  type="date"
                  value={formulario.fechaFin}
                  onChange={(evento) => setFormulario({ ...formulario, fechaFin: evento.target.value })}
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>Cancelar</Button>
          <Button onClick={guardar}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
