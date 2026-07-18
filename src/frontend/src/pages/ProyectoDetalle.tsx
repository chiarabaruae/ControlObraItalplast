import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import {
  ArrowLeft, MapPin, CalendarRange, Factory, HardHat, FileText,
  Upload, FileSpreadsheet, File, Printer, Minus, Plus
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import {
  proyectoPorId, clientePorId, usuarioPorId, avanceGeneral,
  type EtapaSeguimiento, type Proyecto
} from "@/mocks/data";
import { formatFecha, formatFechaCorta } from "@/lib/format";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { EstadoBadge } from "@/components/app/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function pendiente(accion: string) {
  toast(accion, { description: "Se conecta al backend en la Fase 4." });
}

// ── Seguimiento por etapas (fábrica / obra) ─────────────────────
function Seguimiento({ titulo, icono: Icono, etapasIniciales, puedeEditar }: {
  titulo: string;
  icono: typeof Factory;
  etapasIniciales: EtapaSeguimiento[];
  puedeEditar: boolean;
}) {
  const [etapas, setEtapas] = useState(etapasIniciales);

  const ajustar = (i: number, delta: number) => {
    setEtapas((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, avance: Math.min(100, Math.max(0, e.avance + delta)) } : e))
    );
  };

  const total = Math.round(etapas.reduce((a, e) => a + e.avance, 0) / etapas.length);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-heading text-base">
          <Icono className="size-4.5 text-primary" strokeWidth={1.75} /> {titulo}
        </CardTitle>
        <span className="cifra text-sm font-semibold">{total}%</span>
      </CardHeader>
      <CardContent className="space-y-5">
        {etapas.map((etapa, i) => (
          <div key={etapa.nombre}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm">{etapa.nombre}</span>
              {puedeEditar && (
                <span className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="size-6" aria-label={`Bajar avance de ${etapa.nombre}`} onClick={() => ajustar(i, -5)}>
                    <Minus className="size-3" />
                  </Button>
                  <Button variant="outline" size="icon" className="size-6" aria-label={`Subir avance de ${etapa.nombre}`} onClick={() => ajustar(i, 5)}>
                    <Plus className="size-3" />
                  </Button>
                </span>
              )}
            </div>
            <AvanceMeter valor={etapa.avance} size="sm" />
          </div>
        ))}
        {puedeEditar && (
          <p className="border-t pt-3 text-xs text-muted-foreground">
            Ajustás de a 5%. En la Fase 4 cada cambio queda auditado con tu usuario y hora.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Cronograma: barras sobre el rango total del proyecto ────────
function Cronograma({ p }: { p: Proyecto }) {
  const inicio = new Date(`${p.fechaInicio}T00:00:00`).getTime();
  const fin = new Date(`${p.fechaFinEstimada}T00:00:00`).getTime();
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

const DOC_ICONOS = { oferta: FileText, abaco: FileSpreadsheet, plano: File, otro: File };

export default function ProyectoDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const p = id ? proyectoPorId(id) : undefined;
  if (!user) return null;
  if (!p) return <Navigate to="/proyectos" replace />;

  const cliente = clientePorId(p.clienteId);
  const lider = usuarioPorId(p.liderId);
  const totalAberturas = p.aberturas.reduce((a, ab) => a + ab.cantidad, 0);

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
            <span>Líder: <span className="font-medium text-foreground">{lider?.displayName}</span></span>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Avance general</span>
            <span className="cifra">{formatFecha(p.fechaInicio)} → {formatFecha(p.fechaFinEstimada)}</span>
          </div>
          <AvanceMeter valor={avanceGeneral(p)} size="lg" />
        </div>
      </header>

      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
          <TabsTrigger value="fabrica">Fábrica</TabsTrigger>
          <TabsTrigger value="obra">Obra</TabsTrigger>
          <TabsTrigger value="informe">Informe</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Resumen */}
        <TabsContent value="resumen" className="mt-4 space-y-4">
          <Card>
            <CardContent className="text-sm leading-relaxed">{p.descripcion}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-baseline justify-between">
              <CardTitle className="font-heading text-base">Ábaco de aberturas</CardTitle>
              <span className="cifra text-xs text-muted-foreground">{totalAberturas} unidades</span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Medidas</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.aberturas.map((ab) => (
                    <TableRow key={ab.codigo}>
                      <TableCell className="cifra font-medium">{ab.codigo}</TableCell>
                      <TableCell>{ab.descripcion}</TableCell>
                      <TableCell>
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ab.material === "PVC" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {ab.material}
                        </span>
                      </TableCell>
                      <TableCell className="cifra text-right text-muted-foreground">{ab.ancho}×{ab.alto}</TableCell>
                      <TableCell className="cifra text-right">{ab.cantidad}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cronograma */}
        <TabsContent value="cronograma" className="mt-4">
          <Cronograma p={p} />
        </TabsContent>

        {/* Seguimientos */}
        <TabsContent value="fabrica" className="mt-4">
          <Seguimiento titulo="Seguimiento de fábrica" icono={Factory} etapasIniciales={p.etapasFabrica} puedeEditar={permisos.editarAvance(user.role)} />
        </TabsContent>
        <TabsContent value="obra" className="mt-4">
          <Seguimiento titulo="Seguimiento de obra" icono={HardHat} etapasIniciales={p.etapasObra} puedeEditar={permisos.editarAvance(user.role)} />
        </TabsContent>

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
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="senal senal-muted">General</div>
                  <div className="cifra mt-1 text-3xl font-bold">{avanceGeneral(p)}%</div>
                </div>
                <div>
                  <div className="senal senal-muted">Fábrica</div>
                  <div className="cifra mt-1 text-3xl font-bold">{p.avanceFabrica}%</div>
                </div>
                <div>
                  <div className="senal senal-muted">Obra</div>
                  <div className="cifra mt-1 text-3xl font-bold">{p.avanceObra}%</div>
                </div>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                {p.nombre} — {cliente?.nombre}. Inicio {formatFecha(p.fechaInicio)}, entrega estimada {formatFecha(p.fechaFinEstimada)}.
                {" "}{totalAberturas} aberturas en {p.aberturas.length} tipologías. {p.descripcion}
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
                {permisos.subirAbaco(user.role) && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => pendiente("Subir ábaco")}>
                    <Upload className="size-3.5" /> Ábaco
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {p.documentos.map((d) => {
                  const Icono = DOC_ICONOS[d.tipo];
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
