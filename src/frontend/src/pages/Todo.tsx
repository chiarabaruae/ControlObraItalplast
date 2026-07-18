import { useState } from "react";
import { Plus, Check, RotateCcw, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import { tareasIniciales, proyectoPorId, usuarioPorId, type Tarea } from "@/mocks/data";
import { formatFecha } from "@/lib/format";
import { PrioridadBadge } from "@/components/app/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Filtro = "todas" | "pendientes" | "finalizadas";

export default function Todo() {
  const { user } = useAuth();
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  if (!user) return null;

  const esViewer = user.role === "viewer";
  // Viewer: solo sus tareas asignadas. Admin/supervisor: todas.
  const propias = esViewer ? tareas.filter((t) => t.responsableId === user.id) : tareas;
  const visibles = propias.filter((t) => {
    if (filtro === "pendientes") return t.estado !== "finalizada";
    if (filtro === "finalizadas") return t.estado === "finalizada";
    return true;
  });

  const alternar = (t: Tarea) => {
    const finalizada = t.estado === "finalizada";
    setTareas((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, estado: finalizada ? "pendiente" : "finalizada" } : x))
    );
    toast(finalizada ? "Tarea reabierta" : "Tarea completada", { description: t.titulo });
  };

  const eliminar = (t: Tarea) => {
    setTareas((prev) => prev.filter((x) => x.id !== t.id));
    toast("Tarea eliminada", { description: t.titulo });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Tareas</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">To-Do</h1>
          {esViewer && (
            <p className="mt-1 text-sm text-muted-foreground">Tus tareas asignadas. Marcá cada una al terminarla.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {(["todas", "pendientes", "finalizadas"] as Filtro[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                aria-pressed={filtro === f}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {permisos.crearTarea(user.role) && (
            <Button className="gap-2" onClick={() => toast("Nueva tarea", { description: "Se conecta al backend en la Fase 4." })}>
              <Plus className="size-4" /> Nueva tarea
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Tarea</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.map((t) => {
                const finalizada = t.estado === "finalizada";
                const esPropia = t.responsableId === user.id;
                const puedeCompletar = permisos.completarTarea(user.role, esPropia);
                return (
                  <TableRow key={t.id} className={finalizada ? "opacity-55" : ""}>
                    <TableCell>
                      {puedeCompletar && (
                        <Button
                          variant={finalizada ? "ghost" : "outline"}
                          size="icon"
                          className="size-7 rounded-full"
                          aria-label={finalizada ? "Reabrir tarea" : "Completar tarea"}
                          onClick={() => alternar(t)}
                        >
                          {finalizada ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className={`font-medium ${finalizada ? "line-through" : ""}`}>{t.titulo}</TableCell>
                    <TableCell className="text-muted-foreground">{proyectoPorId(t.proyectoId)?.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuarioPorId(t.responsableId)?.displayName}
                      {esPropia && <span className="ml-1.5 rounded bg-accent px-1 py-0.5 text-[10px] font-semibold text-accent-foreground">vos</span>}
                    </TableCell>
                    <TableCell className="cifra text-xs">{formatFecha(t.fechaFin)}</TableCell>
                    <TableCell><PrioridadBadge prioridad={t.prioridad} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {permisos.editarTarea(user.role) && (
                          <Button variant="ghost" size="icon" className="size-7" aria-label="Editar tarea" onClick={() => toast("Editar tarea", { description: "Se conecta al backend en la Fase 4." })}>
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {permisos.eliminarTarea(user.role) && (
                          <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label="Eliminar tarea" onClick={() => eliminar(t)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {visibles.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {esViewer ? "No tenés tareas asignadas con este filtro." : "No hay tareas con este filtro."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
