// Tareas — vista macro: TODAS las tareas de seguimiento que nacen del
// presupuesto de cada proyecto, siempre dependientes de una etapa (bloque).
// La sección de "tareas internas" fue retirada: no hay tareas sueltas.
// Completar una tarea acá abre el mismo diálogo de evidencia que en el
// detalle del proyecto, y actualiza el avance en todos lados.
// Columnas Creación y Modificación: visibles solo para administradores.
import { useState } from "react";
import { Link } from "react-router";
import { Plus, Check, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import { ETIQUETAS_GRUPO } from "@/lib/seguimiento-presupuesto";
import {
  usuarioPorId, obtenerProyectos, guardarProyecto, aplicarCambioTarea, tituloTarea,
  registrarModificacionTarea, PRIORIDADES_TAREA,
  type PrioridadTarea, type Proyecto, type TareaPresupuesto
} from "@/mocks/data";
import { formatFecha, formatFechaHora } from "@/lib/format";
import { useTablaFiltrable } from "@/lib/tabla-filtros";
import { PrioridadBadge } from "@/components/app/EstadoBadge";
import { AvisoFiltros, EncabezadoFiltrable } from "@/components/app/EncabezadoFiltrable";
import { DialogoCompletarTarea } from "@/components/proyectos/DialogoCompletarTarea";
import { DialogoNuevaTarea } from "@/components/proyectos/DialogoNuevaTarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Filtro = "todas" | "pendientes" | "finalizadas";

interface SeleccionSeguimiento {
  proyecto: Proyecto;
  tarea: TareaPresupuesto;
}

export default function Todo() {
  const { user } = useAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>(() => obtenerProyectos());
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [proyectoFiltro, setProyectoFiltro] = useState("todos");
  const [seleccion, setSeleccion] = useState<SeleccionSeguimiento>();
  const [nuevaTareaAbierta, setNuevaTareaAbierta] = useState(false);

  const esViewer = user?.role === "viewer";
  const puedeAvance = user ? permisos.editarAvance(user.role) : false;
  const puedePrioridad = user ? permisos.definirPrioridadTarea(user.role) : false;
  const verAuditoria = user ? permisos.verAuditoriaTareas(user.role) : false;

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
    },
    prioridad: ({ tarea }) => tarea.prioridad ?? "media",
    creacion: {
      valor: ({ tarea }) => (tarea.creadaEn ? formatFechaHora(tarea.creadaEn) : "Sin registro"),
      orden: ({ tarea }) => tarea.creadaEn ?? "9999-12-31",
      tipo: "fecha"
    },
    modificacion: {
      valor: ({ tarea }) => (tarea.modificadaEn ? formatFechaHora(tarea.modificadaEn) : "Sin cambios"),
      orden: ({ tarea }) => tarea.modificadaEn ?? "9999-12-31",
      tipo: "fecha"
    }
  });

  if (!user) return null;

  const persistir = (actualizado: Proyecto) => {
    try {
      guardarProyecto(actualizado);
    } catch {
      toast("No se pudo guardar el avance", {
        description: "El almacenamiento local está lleno. Probá con una imagen más pequeña."
      });
      return false;
    }
    setProyectos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    return true;
  };

  const guardarSeguimiento = (tareaActualizada: TareaPresupuesto) => {
    if (!seleccion) return;
    persistir(aplicarCambioTarea(seleccion.proyecto, tareaActualizada));
  };

  const cambiarPrioridad = (proyecto: Proyecto, tarea: TareaPresupuesto, prioridad: PrioridadTarea) => {
    if (prioridad === (tarea.prioridad ?? "media")) return;
    const actualizada = registrarModificacionTarea(
      { ...tarea, prioridad },
      user.id,
      `Cambió la prioridad a ${prioridad}`
    );
    if (persistir(aplicarCambioTarea(proyecto, actualizada))) {
      toast("Prioridad actualizada", { description: `${tituloTarea(tarea, proyecto)} · ${prioridad}` });
    }
  };

  const agregarTareaSeguimiento = (proyectoId: string, tarea: TareaPresupuesto) => {
    const proyecto = proyectos.find((p) => p.id === proyectoId);
    if (!proyecto) return;
    persistir({
      ...proyecto,
      tareasPresupuesto: [...(proyecto.tareasPresupuesto ?? []), tarea]
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Tareas</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Tareas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {esViewer
              ? "Tareas de seguimiento de los proyectos. Consultá el estado de cada etapa."
              : "Tareas de seguimiento de todos los proyectos, dependientes de cada etapa."}
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
            <Button className="gap-2" onClick={() => setNuevaTareaAbierta(true)}>
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
            <AvisoFiltros control={tablaSeguimiento} unidad="tareas" />
            {tablaSeguimiento.filas.length > 30 && (
              <p className="border-b px-4 py-2.5 text-xs text-muted-foreground">
                Mostrando 30 de {tablaSeguimiento.filas.length}. Entrá a cada proyecto para ver su lista completa.
              </p>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <EncabezadoFiltrable columna="tarea" control={tablaSeguimiento}>Tarea</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="proyecto" control={tablaSeguimiento}>Proyecto</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="bloque" control={tablaSeguimiento}>Bloque</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="entrega" control={tablaSeguimiento}>Entrega</EncabezadoFiltrable>
                  <EncabezadoFiltrable columna="prioridad" control={tablaSeguimiento}>Prioridad</EncabezadoFiltrable>
                  {verAuditoria && (
                    <>
                      <EncabezadoFiltrable columna="creacion" control={tablaSeguimiento}>Creación</EncabezadoFiltrable>
                      <EncabezadoFiltrable columna="modificacion" control={tablaSeguimiento}>Modificación</EncabezadoFiltrable>
                    </>
                  )}
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
                    <TableCell>
                      {puedePrioridad ? (
                        <Select
                          value={tarea.prioridad ?? "media"}
                          onValueChange={(valor) => cambiarPrioridad(proyecto, tarea, valor as PrioridadTarea)}
                        >
                          <SelectTrigger
                            className="h-7 w-28 text-xs"
                            aria-label={`Prioridad de ${tituloTarea(tarea, proyecto)}`}
                          >
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
                    </TableCell>
                    {verAuditoria && (
                      <>
                        <TableCell className="cifra text-xs text-muted-foreground">
                          {tarea.creadaEn ? formatFechaHora(tarea.creadaEn) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tarea.modificadaEn ? (
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <span className="cifra">{formatFechaHora(tarea.modificadaEn)}</span>
                              <span>· {usuarioPorId(tarea.modificadaPorId ?? "")?.displayName ?? "—"}</span>
                              <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold">
                                v{tarea.version ?? 1}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tablaSeguimiento.filas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No hay tareas de seguimiento con este filtro.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <DialogoCompletarTarea
        tarea={seleccion?.tarea}
        etiqueta={seleccion ? `${tituloTarea(seleccion.tarea, seleccion.proyecto)} · ${seleccion.proyecto.nombre}` : ""}
        usuarioId={user.id}
        alCerrar={() => setSeleccion(undefined)}
        alGuardar={guardarSeguimiento}
        puedeReabrir={puedeAvance}
      />

      <DialogoNuevaTarea
        abierto={nuevaTareaAbierta}
        proyectos={proyectos}
        alCerrar={() => setNuevaTareaAbierta(false)}
        alAgregar={agregarTareaSeguimiento}
      />
    </div>
  );
}
