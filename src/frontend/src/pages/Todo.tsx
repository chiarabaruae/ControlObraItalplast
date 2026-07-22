// Tareas — vista macro: junta las tareas internas del equipo con TODAS las
// tareas de seguimiento que nacen del presupuesto de cada proyecto.
// Completar una tarea de seguimiento acá abre el mismo diálogo de evidencia
// que en el detalle del proyecto, y actualiza el avance en todos lados.
import { useState } from "react";
import { Link } from "react-router";
import { Plus, Check, RotateCcw, Trash2, Pencil, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import { ETIQUETAS_GRUPO } from "@/lib/seguimiento-presupuesto";
import {
  tareasIniciales, proyectoPorId, usuarioPorId, obtenerProyectos, guardarProyecto,
  aplicarCambioTarea, tituloTarea, type Proyecto, type Tarea, type TareaPresupuesto
} from "@/mocks/data";
import { formatFecha } from "@/lib/format";
import { useTablaFiltrable } from "@/lib/tabla-filtros";
import { PrioridadBadge } from "@/components/app/EstadoBadge";
import { AvisoFiltros, EncabezadoFiltrable } from "@/components/app/EncabezadoFiltrable";
import { DialogoCompletarTarea } from "@/components/proyectos/DialogoCompletarTarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Filtro = "todas" | "pendientes" | "finalizadas";

interface SeleccionSeguimiento {
  proyecto: Proyecto;
  tarea: TareaPresupuesto;
}

export default function Todo() {
  const { user } = useAuth();
  const [tareas, setTareas] = useState<Tarea[]>(tareasIniciales);
  const [proyectos, setProyectos] = useState<Proyecto[]>(() => obtenerProyectos());
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [proyectoFiltro, setProyectoFiltro] = useState("todos");
  const [seleccion, setSeleccion] = useState<SeleccionSeguimiento>();

  const esViewer = user?.role === "viewer";
  const puedeAvance = user ? permisos.editarAvance(user.role) : false;

  // Tareas internas: el rol Usuario ve solo las suyas.
  const internas = esViewer ? tareas.filter((t) => t.responsableId === user?.id) : tareas;
  const internasVisibles = internas.filter((t) => {
    if (filtro === "pendientes") return t.estado !== "finalizada";
    if (filtro === "finalizadas") return t.estado === "finalizada";
    return true;
  });

  // Tareas de seguimiento de todos los proyectos activos.
  const seguimiento = proyectos.flatMap((proyecto) =>
    (proyecto.tareasPresupuesto ?? []).map((tarea) => ({ proyecto, tarea }))
  );
  const seguimientoDelProyecto = seguimiento.filter(({ proyecto }) =>
    proyectoFiltro === "todos" || proyecto.id === proyectoFiltro
  );
  const seguimientoVisibles = seguimientoDelProyecto.filter(({ tarea }) => {
    if (filtro === "pendientes") return !tarea.completada;
    if (filtro === "finalizadas") return tarea.completada;
    return true;
  });

  const tablaSeguimiento = useTablaFiltrable(seguimientoVisibles, {
    tarea: ({ proyecto, tarea }) => tituloTarea(tarea, proyecto),
    proyecto: ({ proyecto }) => proyecto.nombre,
    bloque: ({ tarea }) => ETIQUETAS_GRUPO[tarea.grupo],
    entrega: {
      valor: ({ tarea }) => (tarea.fechaFin ? formatFecha(tarea.fechaFin) : "Sin fecha"),
      orden: ({ tarea }) => tarea.fechaFin ?? "9999-12-31",
      tipo: "fecha"
    }
  });

  const tablaInternas = useTablaFiltrable(internasVisibles, {
    tarea: (t) => t.titulo,
    proyecto: (t) => proyectoPorId(t.proyectoId)?.nombre ?? "Sin proyecto",
    responsable: (t) => usuarioPorId(t.responsableId)?.displayName ?? "Sin asignar",
    vence: { valor: (t) => formatFecha(t.fechaFin), orden: (t) => t.fechaFin, tipo: "fecha" },
    prioridad: (t) => t.prioridad
  });

  if (!user) return null;

  const alternarInterna = (t: Tarea) => {
    const finalizada = t.estado === "finalizada";
    setTareas((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, estado: finalizada ? "pendiente" : "finalizada" } : x))
    );
    toast(finalizada ? "Tarea reabierta" : "Tarea completada", { description: t.titulo });
  };

  const eliminarInterna = (t: Tarea) => {
    setTareas((prev) => prev.filter((x) => x.id !== t.id));
    toast("Tarea eliminada", { description: t.titulo });
  };

  const guardarSeguimiento = (tareaActualizada: TareaPresupuesto) => {
    if (!seleccion) return;
    const actualizado = aplicarCambioTarea(seleccion.proyecto, {
      ...tareaActualizada,
      completadaPorId: tareaActualizada.completada ? user.id : undefined
    });
    try {
      guardarProyecto(actualizado);
    } catch {
      toast("No se pudo guardar el avance", {
        description: "El almacenamiento local está lleno. Probá con una imagen más pequeña."
      });
      return;
    }
    setProyectos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Tareas</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Tareas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esViewer
              ? "Tus tareas asignadas. Marcá cada una al terminarla."
              : "Tareas internas del equipo y tareas de seguimiento de todos los proyectos."}
          </p>
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
            <Button className="gap-2" onClick={() => toast("Nueva tarea", { description: "Se conecta a la API en la Fase 4." })}>
              <Plus className="size-4" /> Nueva tarea
            </Button>
          )}
        </div>
      </header>

      {/* Seguimiento de proyectos */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <h2 className="font-heading text-sm font-semibold">Seguimiento de proyectos</h2>
            <span className="cifra text-xs text-muted-foreground">
              {seguimientoDelProyecto.filter(({ tarea }) => !tarea.completada).length} pendientes
            </span>
          </div>
          <Select value={proyectoFiltro} onValueChange={setProyectoFiltro}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar seguimiento por proyecto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proyectos</SelectItem>
              {proyectos
                .filter((proyecto) => (proyecto.tareasPresupuesto?.length ?? 0) > 0)
                .map((proyecto) => (
                  <SelectItem key={proyecto.id} value={proyecto.id}>{proyecto.nombre}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <EncabezadoFiltrable columna="tarea" control={tablaSeguimiento}>Tarea</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="proyecto" control={tablaSeguimiento}>Proyecto</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="bloque" control={tablaSeguimiento}>Bloque</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="entrega" control={tablaSeguimiento}>Entrega</EncabezadoFiltrable>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablaSeguimiento.filas.slice(0, 30).map(({ proyecto, tarea }) => (
                  <TableRow key={tarea.id} className={tarea.completada ? "opacity-55" : ""}>
                    <TableCell>
                      <Button
                        variant={tarea.completada ? "default" : "outline"}
                        size="icon"
                        className="size-7 rounded-full"
                        aria-label={`${tarea.completada ? "Ver evidencia de" : "Completar"} ${tituloTarea(tarea, proyecto)}`}
                        onClick={() => setSeleccion({ proyecto, tarea })}
                        disabled={!puedeAvance && !tarea.completada}
                      >
                        <Check className="size-3.5" />
                      </Button>
                    </TableCell>
                    <TableCell className={`font-medium ${tarea.completada ? "line-through" : ""}`}>
                      {tituloTarea(tarea, proyecto)}
                    </TableCell>
                    <TableCell>
                      <Link to={`/proyectos/${proyecto.id}`} className="text-primary hover:underline">
                        {proyecto.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ETIQUETAS_GRUPO[tarea.grupo]}</TableCell>
                    <TableCell className="cifra text-xs">{tarea.fechaFin ? formatFecha(tarea.fechaFin) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tablaSeguimiento.filas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay tareas de seguimiento con este filtro.</p>
            )}
            {tablaSeguimiento.filas.length > 30 && (
              <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
                Mostrando 30 de {tablaSeguimiento.filas.length}. Entrá a cada proyecto para ver su lista completa.
              </p>
            )}
            <AvisoFiltros control={tablaSeguimiento} unidad="tareas" />
          </CardContent>
        </Card>
      </section>

      {/* Tareas internas */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Check className="size-4 text-primary" />
          <h2 className="font-heading text-sm font-semibold">Tareas internas</h2>
        </div>
        <Card>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <EncabezadoFiltrable columna="tarea" control={tablaInternas}>Tarea</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="proyecto" control={tablaInternas}>Proyecto</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="responsable" control={tablaInternas}>Responsable</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="vence" control={tablaInternas}>Vence</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="prioridad" control={tablaInternas}>Prioridad</EncabezadoFiltrable>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablaInternas.filas.map((t) => {
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
                            onClick={() => alternarInterna(t)}
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
                            <Button variant="ghost" size="icon" className="size-7" aria-label="Editar tarea" onClick={() => toast("Editar tarea", { description: "Se conecta a la API en la Fase 4." })}>
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                          {permisos.eliminarTarea(user.role) && (
                            <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label="Eliminar tarea" onClick={() => eliminarInterna(t)}>
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
            {tablaInternas.filas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {esViewer ? "No tenés tareas asignadas con este filtro." : "No hay tareas internas con este filtro."}
              </p>
            )}
            <AvisoFiltros control={tablaInternas} unidad="tareas" />
          </CardContent>
        </Card>
      </section>

      <DialogoCompletarTarea
        tarea={seleccion?.tarea}
        etiqueta={seleccion ? `${tituloTarea(seleccion.tarea, seleccion.proyecto)} · ${seleccion.proyecto.nombre}` : ""}
        alCerrar={() => setSeleccion(undefined)}
        alGuardar={guardarSeguimiento}
        puedeReabrir={puedeAvance}
      />
    </div>
  );
}
