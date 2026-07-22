import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import {
  ArrowLeft, MapPin, CalendarRange, FileText,
  Upload, File, Printer, ListTodo
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import {
  proyectoPorId, clientePorId, usuarioPorId, avanceGeneral, avanceGrupo, guardarProyecto, tareasIniciales,
  nombreTipoProducto, aplicarCambioTarea, eliminarTareaConAuditoria, type Proyecto, type Tarea, type TareaPresupuesto
} from "@/mocks/data";
import { formatFecha, formatFechaCorta } from "@/lib/format";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { EstadoBadge, PrioridadBadge } from "@/components/app/EstadoBadge";
import { SeguimientoPresupuesto } from "@/components/proyectos/SeguimientoPresupuesto";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function pendiente(accion: string) {
  toast(accion, { description: "Se conecta al backend en la Fase 4." });
}

// ── Cronograma: barras sobre el rango total del proyecto ────────
function Cronograma({ p }: { p: Proyecto }) {
  const inicio = new Date(`${p.fechaInicio}T00:00:00`).getTime();
  const fin = new Date(`${p.fechaFinEstimada || p.fechaInicio}T00:00:00`).getTime();
  const rango = Math.max(fin - inicio, 1);
  const pos = (iso: string) => ((new Date(`${iso}T00:00:00`).getTime() - inicio) / rango) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <CalendarRange className="size-4.5 text-primary" strokeWidth={1.75} /> Cronograma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {p.cronograma.map((h) => {
          const izq = Math.max(0, pos(h.inicio));
          const ancho = Math.max(4, Math.min(100, pos(h.fin)) - izq);
          return (
            <div key={h.etapa}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium">{h.etapa}</span>
                <span className="cifra text-muted-foreground">
                  {formatFechaCorta(h.inicio)} → {formatFechaCorta(h.fin)}
                </span>
              </div>
              <div className="relative h-5 overflow-hidden rounded bg-muted">
                <div
                  className="absolute inset-y-0 rounded bg-gradient-to-r from-primary/85 to-primary/60"
                  style={{ left: `${izq}%`, width: `${ancho}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="cifra flex justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>{formatFecha(p.fechaInicio)}</span>
          <span>{formatFecha(p.fechaFinEstimada)}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function TareasProyecto({ tareas }: { tareas: Tarea[] }) {
  const porHacer = tareas.filter((t) => t.estado !== "finalizada");
  const hechas = tareas.filter((t) => t.estado === "finalizada");

  const TablaTareas = ({ titulo, items }: { titulo: string; items: Tarea[] }) => (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <ListTodo className="size-4.5 text-primary" strokeWidth={1.75} /> {titulo}
        </CardTitle>
        <span className="cifra text-xs text-muted-foreground">{items.length}</span>
      </CardHeader>
      <CardContent className="px-0">
        {items.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Prioridad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.id} className={t.estado === "finalizada" ? "opacity-60" : ""}>
                  <TableCell className={`font-medium ${t.estado === "finalizada" ? "line-through" : ""}`}>{t.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{usuarioPorId(t.responsableId)?.displayName ?? "Sin asignar"}</TableCell>
                  <TableCell className="cifra text-xs">{formatFecha(t.fechaFin)}</TableCell>
                  <TableCell><PrioridadBadge prioridad={t.prioridad} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="px-6 py-8 text-sm text-muted-foreground">No hay tareas en este estado.</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TablaTareas titulo="Por hacer" items={porHacer} />
      <TablaTareas titulo="Hechas" items={hechas} />
    </div>
  );
}

function SeguimientoPendiente() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <ListTodo className="size-6" />
        </div>
        <h2 className="mt-4 font-heading font-semibold">Seguimiento pendiente de generar</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Este proyecto todavía no tiene componentes y tareas generadas desde un presupuesto ejecutivo. El avance manual por porcentajes ya no está disponible.
        </p>
      </CardContent>
    </Card>
  );
}

const DOC_ICONOS = { oferta: FileText, presupuesto: FileText, plano: File, otro: File };

export default function ProyectoDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const [p, setProyecto] = useState<Proyecto | undefined>(() => (id ? proyectoPorId(id) : undefined));
  if (!user) return null;
  if (!p) return <Navigate to="/proyectos" replace />;

  const persistir = (transformar: (actual: Proyecto) => Proyecto) => {
    setProyecto((actual) => {
      if (!actual) return actual;
      const actualizado = transformar(actual);
      try {
        guardarProyecto(actualizado);
      } catch {
        toast("No se pudo guardar el avance", {
          description: "El almacenamiento local está lleno. Probá con una imagen más pequeña."
        });
        return actual;
      }
      return actualizado;
    });
  };

  const actualizarTareaPresupuesto = (tareaActualizada: TareaPresupuesto) => {
    persistir((actual) => aplicarCambioTarea(actual, tareaActualizada));
  };

  const agregarTareaPresupuesto = (nueva: TareaPresupuesto) => {
    persistir((actual) => ({
      ...actual,
      tareasPresupuesto: [...(actual.tareasPresupuesto ?? []), nueva]
    }));
  };

  const eliminarTareaPresupuesto = (tarea: TareaPresupuesto) => {
    // Borrado lógico: queda registrada en `tareasEliminadas` (solo datos, sin UI).
    persistir((actual) => eliminarTareaConAuditoria(actual, tarea, user.id));
  };

  const cliente = clientePorId(p.clienteId);
  const lider = usuarioPorId(p.liderId);
  const itemsPresupuesto = p.presupuestoEjecutivo?.items ?? [];
  const totalComponentes = itemsPresupuesto.length > 0
    ? itemsPresupuesto.reduce((total, item) => total + item.cantidad, 0)
    : p.aberturas.reduce((total, abertura) => total + abertura.cantidad, 0);
  const tareasDelProyecto = tareasIniciales.filter((t) => t.proyectoId === p.id);
  const productos = p.productos?.length
    ? p.productos
    : p.tipoProducto
      ? [{
          tipo: p.tipoProducto,
          etapasFabricacionPremarcos: p.etapasFabricacionPremarcos,
          etapasInstalacionPremarcos: p.etapasInstalacionPremarcos,
          etapasFabrica: p.etapasFabrica,
          etapasObra: p.etapasObra
        }]
      : [];
  const productosOperativos = productos.filter((producto) => producto.tipo !== "servicios");
  const soloServicios = productos.length > 0 && productosOperativos.length === 0;
  const seguimientoGenerado = Boolean(p.tareasPresupuesto?.length && p.presupuestoEjecutivo?.items.length);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/proyectos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Proyectos
      </Link>

      {/* Cabecera de obra */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{p.nombre}</h1>
            <EstadoBadge estado={p.estado} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {p.ubicacion}</span>
            <span>{cliente?.nombre}</span>
            <span>Líder: <span className="font-medium text-foreground">{lider?.displayName ?? "Sin asignar"}</span></span>
          </div>
          {productos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {productos.map((producto) => (
                <span key={producto.tipo} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {nombreTipoProducto(producto.tipo)}
                </span>
              ))}
            </div>
          )}
        </div>
        {soloServicios ? (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Servicio</div>
            <div className="cifra mt-1 text-xs">Inicio: {formatFecha(p.fechaInicio)}</div>
          </div>
        ) : (
          <div className="w-full sm:w-64">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Avance general</span>
              <span className="cifra">{formatFecha(p.fechaInicio)} → {formatFecha(p.fechaFinEstimada)}</span>
            </div>
            <AvanceMeter valor={avanceGeneral(p)} size="lg" />
          </div>
        )}
      </header>

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          {!soloServicios && (
            <>
              <TabsTrigger value="fabrica">Fábrica</TabsTrigger>
              <TabsTrigger value="instalacion">Instalación</TabsTrigger>
            </>
          )}
          <TabsTrigger value="informe">Informe</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="resumen" className="mt-4 space-y-4">
          <Card>
            <CardContent className="text-sm leading-relaxed">{p.descripcion}</CardContent>
          </Card>
          {!soloServicios && <Card>
            <CardHeader className="flex-row items-baseline justify-between">
              <div>
                <CardTitle className="font-heading text-base">Componentes del presupuesto ejecutivo</CardTitle>
                {p.presupuestoEjecutivo && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.presupuestoEjecutivo.numero ? `Nº ${p.presupuestoEjecutivo.numero} · ` : ""}{p.presupuestoEjecutivo.nombreArchivo}
                  </p>
                )}
              </div>
              <span className="cifra text-xs text-muted-foreground">{totalComponentes} unidades</span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Medidas</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsPresupuesto.length > 0
                    ? itemsPresupuesto.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="cifra font-medium">{item.codigo}</TableCell>
                          <TableCell>
                            <div>{item.descripcion}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{item.ambiente}{item.color ? ` · ${item.color}` : ""}</div>
                          </TableCell>
                          <TableCell><span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">{nombreTipoProducto(item.tipoProducto)}</span></TableCell>
                          <TableCell className="cifra text-right text-muted-foreground">{item.ancho}×{item.alto}</TableCell>
                          <TableCell className="cifra text-right">{item.cantidad}</TableCell>
                        </TableRow>
                      ))
                    : p.aberturas.map((ab) => (
                        <TableRow key={ab.codigo}>
                          <TableCell className="cifra font-medium">{ab.codigo}</TableCell>
                          <TableCell>{ab.descripcion}</TableCell>
                          <TableCell>{ab.material}</TableCell>
                          <TableCell className="cifra text-right text-muted-foreground">{ab.ancho}×{ab.alto}</TableCell>
                          <TableCell className="cifra text-right">{ab.cantidad}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>}
        </TabsContent>

        {/* Tareas */}
        <TabsContent value="tareas" className="mt-4">
          <TareasProyecto tareas={tareasDelProyecto} />
        </TabsContent>

        {/* Cronograma */}
        <TabsContent value="cronograma" className="mt-4">
          <Cronograma p={p} />
        </TabsContent>

        {/* Seguimiento generado por presupuesto, con compatibilidad para proyectos anteriores. */}
        {!soloServicios && (
          <TabsContent value="fabrica" className="mt-4">
            {seguimientoGenerado ? (
              <SeguimientoPresupuesto proyecto={p} lado="fabrica" puedeEditar={permisos.editarAvance(user.role)} usuarioId={user.id} alActualizar={actualizarTareaPresupuesto} alAgregar={agregarTareaPresupuesto} alEliminarTarea={eliminarTareaPresupuesto} />
            ) : (
              <SeguimientoPendiente />
            )}
          </TabsContent>
        )}
        {!soloServicios && (
          <TabsContent value="instalacion" className="mt-4">
            {seguimientoGenerado ? (
              <SeguimientoPresupuesto proyecto={p} lado="instalacion" puedeEditar={permisos.editarAvance(user.role)} usuarioId={user.id} alActualizar={actualizarTareaPresupuesto} alAgregar={agregarTareaPresupuesto} alEliminarTarea={eliminarTareaPresupuesto} />
            ) : (
              <SeguimientoPendiente />
            )}
          </TabsContent>
        )}

        {/* Informe */}
        <TabsContent value="informe" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-base">Informe de avance</CardTitle>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                <Printer className="size-3.5" /> Imprimir
              </Button>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className={`grid gap-4 ${soloServicios ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
                <div>
                  <div className="senal senal-muted">{soloServicios ? "Tipo" : "General"}</div>
                  <div className="cifra mt-1 text-3xl font-bold">{soloServicios ? "Servicio" : `${avanceGeneral(p)}%`}</div>
                </div>
                {!soloServicios && <div>
                  <div className="senal senal-muted">Fábrica</div>
                  <div className="cifra mt-1 text-3xl font-bold">{avanceGrupo(p, ["fabricacion_premarcos", "fabrica"], p.avanceFabrica)}%</div>
                </div>}
                {!soloServicios && <div>
                  <div className="senal senal-muted">Instalación</div>
                  <div className="cifra mt-1 text-3xl font-bold">{avanceGrupo(p, ["instalacion_premarcos", "instalacion"], p.avanceObra)}%</div>
                </div>}
              </div>
              <p className="leading-relaxed text-muted-foreground">
                {p.nombre} — {cliente?.nombre}. Inicio {formatFecha(p.fechaInicio)}
                {!soloServicios && `, entrega estimada ${formatFecha(p.fechaFinEstimada)}`}.
                {!soloServicios && ` ${totalComponentes} unidades en ${itemsPresupuesto.length || p.aberturas.length} componentes.`} {p.descripcion}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="font-heading text-base">Documentos</CardTitle>
              <div className="flex gap-2">
                {permisos.subirOferta(user.role) && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => pendiente("Subir oferta PDF")}>
                    <Upload className="size-3.5" /> Oferta PDF
                  </Button>
                )}
                {permisos.gestionarPresupuesto(user.role) && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => pendiente("Reemplazar presupuesto ejecutivo")}>
                    <Upload className="size-3.5" /> Presupuesto ejecutivo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {p.documentos.map((d) => {
                  const Icono = DOC_ICONOS[d.tipo] ?? File;
                  return (
                    <li key={d.nombre} className="flex items-center gap-3 py-3 text-sm">
                      <Icono className="size-4.5 shrink-0 text-primary" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate font-medium">{d.nombre}</span>
                      <span className="cifra shrink-0 text-xs text-muted-foreground">
                        {formatFecha(d.fecha)} · {d.tamano}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
