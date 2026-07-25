// Cronograma general (D-033): Gantt de todas las obras por proyecto × producto,
// derivado de la planificación backward de cada producto. Suma la demanda de
// aberturas/día en fábrica (por línea) e instalación y la compara contra los
// topes de capacidad configurados. Solo lectura; las fechas se editan en el
// detalle del proyecto.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import {
  clientePorId,
  nombreCortoTipoProducto,
  nombreTipoProducto,
  usuarioPorId,
  type EstadoObra,
  type Proyecto,
  type TipoProducto
} from "@/mocks/data";
import {
  construirCronograma,
  demandaDiaria,
  type FilaCronograma,
  type TipoSegmento
} from "@/lib/cronograma";
import {
  obtenerTopesCapacidad, topeFabrica, topeInstalacion,
  topePremarcosFabricacion, topePremarcosInstalacion
} from "@/lib/capacidad";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Zoom = "dia" | "semana" | "mes";

const PX_POR_DIA: Record<Zoom, number> = { dia: 26, semana: 9, mes: 3.6 };
const HEADW = 300;
const MAX_DIAS = 540;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// ── utilidades de fecha (UTC, consistentes con lib/planificacion) ──
function aUTC(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}
function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
const DIA = 86400000;
function sumar(isoStr: string, dias: number): string {
  return iso(aUTC(isoStr) + dias * DIA);
}
function diff(a: string, b: string): number {
  return Math.round((aUTC(b) - aUTC(a)) / DIA);
}
function lunesDe(isoStr: string): string {
  const dow = new Date(aUTC(isoStr)).getUTCDay(); // 0=dom
  const retro = dow === 0 ? 6 : dow - 1;
  return sumar(isoStr, -retro);
}
function primeroDeMes(isoStr: string): string {
  return `${isoStr.slice(0, 8)}01`;
}
function sumarMeses(isoStr: string, n: number): string {
  const [a, m] = isoStr.split("-").map(Number);
  const total = (a * 12 + (m - 1)) + n;
  return `${String(Math.floor(total / 12)).padStart(4, "0")}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

interface Bucket {
  inicio: string;
  fin: string;
  xPx: number;
  wPx: number;
  labelSub: string;
  mes: number;
  anio: number;
  fabPeak: Record<string, number>;
  instPeak: number;
  preFabPeak: number;
  preInstPeak: number;
}

// Paleta categórica (ColorHunt-inspired), pensada para que las 4 barras + 2 hitos
// + sobrecapacidad sean claramente distinguibles entre sí.
const PALETA = {
  fabricacionPremarcos: "#E8963A", // naranja
  instalacionPremarcos: "#8155BA", // violeta
  fabricaAberturas: "#2F9E6B", // verde
  instalacion: "#2D6CC0", // azul
  confirmacionCliente: "#5B6B7C", // pizarra (hito)
  relevamientoTecnico: "#0E9AA7", // turquesa (hito)
  firmaPresupuesto: "#E11D48", // rosa fuerte (hito)
  sobrecapacidad: "#B91C1C" // rojo (alerta)
} as const;

const COLOR_SEG: Record<TipoSegmento, string> = {
  fabricacion_premarcos: "bg-[#E8963A]",
  instalacion_premarcos: "bg-[#8155BA]",
  fabrica: "bg-[#2F9E6B]",
  instalacion: "bg-[#2D6CC0]"
};
const LABEL_SEG: Record<TipoSegmento, string> = {
  fabricacion_premarcos: "Fab. premarcos",
  instalacion_premarcos: "Inst. premarcos",
  fabrica: "Fábrica",
  instalacion: "Instalación"
};

const LABEL_HITO: Record<"firma" | "cliente" | "relevamiento", string> = {
  firma: "Firma de Presupuesto Ejecutivo",
  cliente: "Confirmación del cliente",
  relevamiento: "Relevamiento técnico"
};

// Punto de estado del proyecto: mínimo, con tooltip, para no recargar el cronograma.
const ESTADO_DOT: Record<EstadoObra, { color: string; label: string }> = {
  planificada: { color: "bg-muted-foreground/45", label: "Planificada" },
  pendiente: { color: "bg-estado-pendiente", label: "Pendiente" },
  en_progreso: { color: "bg-estado-progreso", label: "En progreso" },
  pausada: { color: "bg-estado-pausada", label: "Pausada" },
  finalizada: { color: "bg-primary", label: "Finalizada" },
  cancelada: { color: "bg-estado-riesgo", label: "Cancelada" }
};

export function GanttProyectos({ proyectos }: { proyectos: Proyecto[] }) {
  const [zoom, setZoom] = useState<Zoom>(
    () => (["dia", "semana", "mes"].includes(localStorage.getItem("co-gantt-zoom") ?? "") ? (localStorage.getItem("co-gantt-zoom") as Zoom) : "semana")
  );
  const [fProducto, setFProducto] = useState<string>("todos");
  const [fLider, setFLider] = useState<string>("todos");
  const [fCliente, setFCliente] = useState<string>("todos");
  // La capacidad arranca colapsada: lo principal es "Proyectos con compromiso".
  const [capacidadAbierta, setCapacidadAbierta] = useState(false);

  const cambiarZoom = (z: Zoom) => {
    setZoom(z);
    localStorage.setItem("co-gantt-zoom", z);
  };

  const proyectosFiltrados = useMemo(
    () =>
      proyectos.filter(
        (p) =>
          (fLider === "todos" || p.liderId === fLider) &&
          (fCliente === "todos" || p.clienteId === fCliente)
      ),
    [proyectos, fLider, fCliente]
  );

  const { filas: filasTodas, sinCompromiso } = useMemo(
    () => construirCronograma(proyectosFiltrados),
    [proyectosFiltrados]
  );
  const filas = useMemo(
    () => filasTodas.filter((f) => fProducto === "todos" || String(f.tipoProducto) === fProducto),
    [filasTodas, fProducto]
  );

  const pxDia = PX_POR_DIA[zoom];
  const hoy = new Date().toISOString().slice(0, 10);

  // Ancho visible del área desplazable: con él se extiende el rango para que la
  // escala (semana/mes) siempre cubra todo el ancho con fechas consecutivas.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [anchoVisible, setAnchoVisible] = useState(0);
  useEffect(() => {
    const nodo = scrollRef.current;
    if (!nodo || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entrada]) => setAnchoVisible(entrada.contentRect.width));
    observer.observe(nodo);
    return () => observer.disconnect();
  }, []);

  // rango temporal a partir de segmentos + hitos (siempre incluye "hoy")
  const { inicio: rangoInicio, totalDias } = useMemo(() => {
    let min: string | undefined;
    let max: string | undefined;
    for (const fila of filas) {
      for (const seg of fila.segmentos) {
        if (!min || seg.inicio < min) min = seg.inicio;
        if (!max || seg.fin > max) max = seg.fin;
      }
      for (const h of fila.hitos) {
        if (!min || h.fecha < min) min = h.fecha;
        if (!max || h.fecha > max) max = h.fecha;
      }
    }
    // Días mínimos para que la escala llene todo el ancho visible sin huecos.
    const diasParaLlenar = anchoVisible > HEADW ? Math.ceil((anchoVisible - HEADW) / pxDia) : 0;
    if (!min || !max) return { inicio: lunesDe(hoy), totalDias: Math.max(84, diasParaLlenar) };
    const desde = min < hoy ? min : hoy;
    const hasta = max > hoy ? max : hoy;
    const inicio = lunesDe(sumar(desde, -3));
    let total = diff(inicio, sumar(hasta, 7));
    total = Math.min(Math.max(total, 42, diasParaLlenar), MAX_DIAS);
    return { inicio, totalDias: total };
  }, [filas, hoy, anchoVisible, pxDia]);

  const totalPx = totalDias * pxDia;
  const xDe = (fecha: string) => Math.max(0, Math.min(totalPx, diff(rangoInicio, fecha) * pxDia));

  // buckets según zoom, con demanda pico por bucket
  const buckets = useMemo<Bucket[]>(() => {
    const rangoFin = sumar(rangoInicio, totalDias);
    const lista: { inicio: string; fin: string }[] = [];
    if (zoom === "dia") {
      for (let d = rangoInicio; d < rangoFin; d = sumar(d, 1)) lista.push({ inicio: d, fin: d });
    } else if (zoom === "semana") {
      for (let d = rangoInicio; d < rangoFin; d = sumar(d, 7)) lista.push({ inicio: d, fin: sumar(d, 6) });
    } else {
      for (let d = primeroDeMes(rangoInicio); d < rangoFin; d = sumarMeses(d, 1)) {
        lista.push({ inicio: d, fin: sumar(sumarMeses(d, 1), -1) });
      }
    }
    return lista.map((b) => {
      const fabPeak: Record<string, number> = {};
      let instPeak = 0;
      let preFabPeak = 0;
      let preInstPeak = 0;
      const limite = b.fin < rangoFin ? b.fin : sumar(rangoFin, -1);
      for (let d = b.inicio; d <= limite; d = sumar(d, 1)) {
        const dem = demandaDiaria(filas, d);
        for (const [t, v] of Object.entries(dem.fabrica)) fabPeak[t] = Math.max(fabPeak[t] ?? 0, v);
        instPeak = Math.max(instPeak, dem.instalacion);
        preFabPeak = Math.max(preFabPeak, dem.premarcosFabricacion);
        preInstPeak = Math.max(preInstPeak, dem.premarcosInstalacion);
      }
      const anio = Number(b.inicio.slice(0, 4));
      const mes = Number(b.inicio.slice(5, 7)) - 1;
      const dm = Number(b.inicio.slice(8, 10));
      return {
        inicio: b.inicio,
        fin: b.fin,
        xPx: xDe(b.inicio),
        wPx: (diff(b.inicio, b.fin) + 1) * pxDia,
        labelSub: zoom === "mes" ? MESES[mes] : String(dm),
        mes,
        anio,
        fabPeak,
        instPeak,
        preFabPeak,
        preInstPeak
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, rangoInicio, totalDias, zoom, pxDia]);

  // grupos de mes para el encabezado
  const gruposMes = useMemo(() => {
    const grupos: { label: string; xPx: number; wPx: number }[] = [];
    let dm = primeroDeMes(rangoInicio);
    const rangoFin = sumar(rangoInicio, totalDias);
    while (dm < rangoFin) {
      const siguiente = sumarMeses(dm, 1);
      const desde = dm < rangoInicio ? rangoInicio : dm;
      const hasta = siguiente < rangoFin ? siguiente : rangoFin;
      const mes = Number(dm.slice(5, 7)) - 1;
      grupos.push({
        label: `${MESES[mes]} ${dm.slice(0, 4)}`,
        xPx: xDe(desde),
        wPx: diff(desde, hasta) * pxDia
      });
      dm = siguiente;
    }
    return grupos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangoInicio, totalDias, pxDia]);

  // líneas de capacidad: cada producto con demanda de fábrica + una de instalación
  const topes = obtenerTopesCapacidad();
  const lineasFabrica = useMemo(() => {
    const set = new Set<string>();
    for (const f of filas) if (f.segmentos.some((s) => s.tipo === "fabrica")) set.add(String(f.tipoProducto));
    return [...set];
  }, [filas]);
  const hayInstalacion = filas.some((f) => f.segmentos.some((s) => s.tipo === "instalacion"));
  // Los premarcos también son carga operativa: se muestran como líneas propias.
  const hayFabPremarcos = filas.some((f) => f.segmentos.some((s) => s.tipo === "fabricacion_premarcos"));
  const hayInstPremarcos = filas.some((f) => f.segmentos.some((s) => s.tipo === "instalacion_premarcos"));

  const opcionesProducto = useMemo(() => {
    const set = new Map<string, string>();
    for (const f of filasTodas) set.set(String(f.tipoProducto), nombreTipoProducto(f.tipoProducto));
    return [...set.entries()];
  }, [filasTodas]);
  const opcionesLider = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of proyectos) if (p.liderId) set.set(p.liderId, usuarioPorId(p.liderId)?.displayName ?? p.liderId);
    return [...set.entries()];
  }, [proyectos]);
  const opcionesCliente = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of proyectos) if (p.clienteId) set.set(p.clienteId, clientePorId(p.clienteId)?.nombre ?? p.clienteId);
    return [...set.entries()];
  }, [proyectos]);

  return (
    <div className="space-y-4">
      {/* Barra de control */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <FiltroSelect etiqueta="Producto" valor={fProducto} onValueChange={setFProducto} opciones={opcionesProducto} />
          <FiltroSelect etiqueta="Líder" valor={fLider} onValueChange={setFLider} opciones={opcionesLider} />
          <FiltroSelect etiqueta="Cliente" valor={fCliente} onValueChange={setFCliente} opciones={opcionesCliente} />
        </div>
        <div className="ml-auto flex rounded-lg border bg-card p-0.5" role="group" aria-label="Escala temporal">
          {(["dia", "semana", "mes"] as Zoom[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => cambiarZoom(z)}
              aria-pressed={zoom === z}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors",
                zoom === z ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {z === "dia" ? "Día" : z === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Referencias */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <Referencia clase="bg-[#E8963A]" texto="Fabricación premarcos" />
        <Referencia clase="bg-[#8155BA]" texto="Instalación de premarcos" />
        <Referencia clase="bg-[#2F9E6B]" texto="Fabricación aberturas" />
        <Referencia clase="bg-[#2D6CC0]" texto="Instalación" />
        <ReferenciaHito clase="bg-[#5B6B7C]" texto="Confirmación del cliente" />
        <ReferenciaHito clase="bg-[#0E9AA7]" texto="Relevamiento técnico" />
        <ReferenciaHito clase="bg-[#E11D48]" texto="Firma de Presupuesto Ejecutivo" />
        <Referencia clase="bg-[#B91C1C]" texto="Sobrecapacidad" />
      </div>

      {filas.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No hay productos con planificación cargada para mostrar en el cronograma.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <div className="overflow-x-auto" ref={scrollRef}>
            <div style={{ minWidth: HEADW + totalPx }}>
              {/* Encabezado */}
              <div className="sticky top-0 z-20 flex h-[52px] border-b bg-muted/40">
                <div
                  className="sticky left-0 z-30 flex items-center border-r bg-muted px-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                  style={{ width: HEADW, minWidth: HEADW }}
                >
                  Proyecto / Producto
                </div>
                <div className="relative" style={{ width: totalPx }}>
                  {gruposMes.map((g, i) => (
                    <div
                      key={i}
                      className="absolute top-0 flex h-6 items-center border-l pl-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                      style={{ left: g.xPx, width: g.wPx }}
                    >
                      {g.label}
                    </div>
                  ))}
                  {buckets.map((b, i) => (
                    <div
                      key={i}
                      className={cn(
                        "absolute bottom-0 flex h-7 items-center justify-center border-l text-[9px] tabular-nums",
                        b.inicio <= hoy && b.fin >= hoy ? "font-bold text-primary" : "text-muted-foreground/70"
                      )}
                      style={{ left: b.xPx, width: b.wPx }}
                    >
                      {zoom !== "dia" || b.wPx >= 18 ? b.labelSub : ""}
                    </div>
                  ))}
                </div>
              </div>

              {/* Capacidad (colapsable; oculta por defecto para priorizar los proyectos) */}
              <SectionLabel
                texto="Capacidad — demanda pico vs. tope"
                nota="aberturas/día"
                colapsable
                abierta={capacidadAbierta}
                onToggle={() => setCapacidadAbierta((v) => !v)}
              />
              {capacidadAbierta && hayFabPremarcos && (
                <CapacidadRow
                  nombre="Premarcos · fabricación"
                  color={PALETA.fabricacionPremarcos}
                  tope={topePremarcosFabricacion(topes)}
                  buckets={buckets}
                  valorDe={(b) => b.preFabPeak}
                  totalPx={totalPx}
                />
              )}
              {capacidadAbierta && hayInstPremarcos && (
                <CapacidadRow
                  nombre="Premarcos · instalación"
                  color={PALETA.instalacionPremarcos}
                  tope={topePremarcosInstalacion(topes)}
                  buckets={buckets}
                  valorDe={(b) => b.preInstPeak}
                  totalPx={totalPx}
                />
              )}
              {capacidadAbierta && lineasFabrica.map((tipo) => (
                <CapacidadRow
                  key={`fab-${tipo}`}
                  nombre={`Fábrica · ${nombreCortoTipoProducto(tipo as TipoProducto)}`}
                  color={PALETA.fabricaAberturas}
                  tope={topeFabrica(tipo as TipoProducto, topes)}
                  buckets={buckets}
                  valorDe={(b) => b.fabPeak[tipo] ?? 0}
                  totalPx={totalPx}
                />
              ))}
              {capacidadAbierta && hayInstalacion && (
                <CapacidadRow
                  nombre="Instalación (cuadrillas)"
                  color={PALETA.instalacion}
                  tope={topeInstalacion(topes)}
                  buckets={buckets}
                  valorDe={(b) => b.instPeak}
                  totalPx={totalPx}
                />
              )}

              {/* Proyectos */}
              <SectionLabel texto="Proyectos con compromiso" nota={`${filas.length} ${filas.length === 1 ? "fila" : "filas"}`} />
              {filas.map((fila, i) => (
                <FilaGantt key={i} fila={fila} totalPx={totalPx} xDe={xDe} pxDia={pxDia} hoyX={xDe(hoy)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {sinCompromiso.length > 0 && (
        <section className="rounded-2xl border border-dashed border-estado-pausada/40 bg-estado-pausada/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            Sin compromiso de fecha
            <span className="rounded-full bg-estado-pausada/15 px-2 py-0.5 text-[10px] font-bold text-estado-pausada">
              {sinCompromiso.length} {sinCompromiso.length === 1 ? "producto" : "productos"}
            </span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Productos operativos aún sin planificación backward. No cargan en el cronograma hasta completar sus fechas desde el detalle del proyecto.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sinCompromiso.map((sc, i) => (
              <Link
                key={i}
                to={`/proyectos/${sc.proyecto.id}`}
                className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 hover:border-primary/40"
              >
                <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {nombreCortoTipoProducto(sc.tipoProducto)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{sc.proyecto.nombre}</span>
                  <span className="block truncate text-[10.5px] text-muted-foreground">
                    {clientePorId(sc.proyecto.clienteId)?.nombre ?? sc.proyecto.ubicacion} · {sc.totalAberturas} ab.
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-primary">Planificar →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FilaGantt({
  fila,
  totalPx,
  xDe,
  pxDia,
  hoyX
}: {
  fila: FilaCronograma;
  totalPx: number;
  xDe: (fecha: string) => number;
  pxDia: number;
  hoyX: number;
}) {
  const cliente = clientePorId(fila.proyecto.clienteId)?.nombre;
  const lider = usuarioPorId(fila.proyecto.liderId)?.displayName;
  return (
    <div className="group flex h-11 border-t">
      <div
        className="sticky left-0 z-10 flex items-center gap-2 border-r bg-card px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] group-hover:bg-muted"
        style={{ width: HEADW, minWidth: HEADW }}
      >
        <span
          className={cn("size-2.5 shrink-0 self-center rounded-full", ESTADO_DOT[fila.proyecto.estado].color)}
          title={`Estado: ${ESTADO_DOT[fila.proyecto.estado].label}`}
          aria-label={`Estado: ${ESTADO_DOT[fila.proyecto.estado].label}`}
        />
        <div className="min-w-0 flex-1">
          <Link to={`/proyectos/${fila.proyecto.id}`} className="block truncate text-[12.5px] font-semibold hover:text-primary">
            {fila.proyecto.nombre}
          </Link>
          <div className="truncate text-[10px] text-muted-foreground">{[lider, cliente].filter(Boolean).join(" · ")}</div>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
          {nombreCortoTipoProducto(fila.tipoProducto)}
        </span>
        <span className="shrink-0 text-right text-[12px] font-bold tabular-nums">
          {fila.totalAberturas}
          <span className="block text-[8px] font-medium uppercase tracking-wide text-muted-foreground">ab.</span>
        </span>
      </div>
      <div className="relative bg-card group-hover:bg-muted/40" style={{ width: totalPx }}>
        {hoyX >= 0 && hoyX <= totalPx && (
          <div className="absolute inset-y-0 z-0 w-0.5 bg-primary/40" style={{ left: hoyX }} />
        )}
        {fila.segmentos.map((seg, i) => {
          const left = xDe(seg.inicio);
          const width = Math.max(5, (diffLocal(seg.inicio, seg.fin) + 1) * pxDia - 2);
          return (
            <div
              key={i}
              className={cn("absolute top-1/2 z-[1] flex -translate-y-1/2 items-center overflow-hidden rounded-md shadow-xs", COLOR_SEG[seg.tipo])}
              style={{ left, width, height: seg.tipo.includes("premarcos") ? 11 : 15 }}
              title={`${LABEL_SEG[seg.tipo]}: ${formatFecha(seg.inicio)} → ${formatFecha(seg.fin)}`}
            >
              {width > 58 && !seg.tipo.includes("premarcos") && (
                <span className="truncate px-1.5 text-[9px] font-bold text-white/95">{LABEL_SEG[seg.tipo]}</span>
              )}
            </div>
          );
        })}
        {fila.hitos.map((h, i) => (
          <div
            key={i}
            className={cn(
              "absolute top-1/2 z-[2] size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-[1.5px] border-card",
              h.tipo === "firma" ? "bg-[#E11D48]" : h.tipo === "relevamiento" ? "bg-[#0E9AA7]" : "bg-[#5B6B7C]"
            )}
            style={{ left: xDe(h.fecha) + pxDia / 2 }}
            title={`${LABEL_HITO[h.tipo]}: ${formatFecha(h.fecha)}`}
          />
        ))}
      </div>
    </div>
  );
}

function diffLocal(a: string, b: string): number {
  return Math.round((aUTC(b) - aUTC(a)) / DIA);
}

function CapacidadRow({
  nombre,
  color,
  tope,
  buckets,
  valorDe,
  totalPx
}: {
  nombre: string;
  color: string;
  tope: number;
  buckets: Bucket[];
  valorDe: (b: Bucket) => number;
  totalPx: number;
}) {
  return (
    <div className="flex h-9 border-t bg-muted/20">
      <div
        className="sticky left-0 z-10 flex items-center gap-2 border-r bg-muted px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
        style={{ width: HEADW, minWidth: HEADW }}
      >
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
        <span className="flex-1 truncate text-[12px] font-semibold">{nombre}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">tope {tope}/d</span>
      </div>
      <div className="relative" style={{ width: totalPx }}>
        {buckets.map((b, i) => {
          const v = valorDe(b);
          const over = v > tope;
          const alTope = v === tope && v > 0;
          return (
            <div
              key={i}
              className="absolute inset-y-0 flex items-center justify-center border-l"
              style={{ left: b.xPx, width: b.wPx }}
            >
              {v > 0 && (
                <span
                  className={cn(
                    "flex min-w-[22px] items-center justify-center rounded px-1 py-0.5 text-[10px] font-bold tabular-nums",
                    over ? "bg-[#B91C1C] text-white ring-2 ring-[#B91C1C]/30" : alTope ? "bg-[#B91C1C]/15 text-[#B91C1C]" : "bg-muted text-foreground/80"
                  )}
                  title={`Demanda pico ${v}/día · tope ${tope}/día${over ? " · SOBRECAPACIDAD" : ""}`}
                >
                  {v}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({
  texto,
  nota,
  colapsable,
  abierta,
  onToggle
}: {
  texto: string;
  nota?: string;
  colapsable?: boolean;
  abierta?: boolean;
  onToggle?: () => void;
}) {
  const contenido = (
    <>
      {colapsable && (
        <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", abierta && "rotate-90")} />
      )}
      {texto}
      {nota && <span className="font-semibold normal-case text-muted-foreground/70">· {nota}</span>}
    </>
  );

  // La barra ocupa todo el ancho, pero el contenido va en una celda sticky para
  // que el rótulo quede fijo al desplazar horizontalmente (no se "mueve").
  const claseCelda =
    "sticky left-0 z-[5] flex w-max items-center gap-2 pr-4 pl-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground";

  return (
    <div className="flex border-t bg-muted/50 py-1.5">
      {colapsable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={abierta}
          className={cn(claseCelda, "transition-colors hover:text-foreground")}
        >
          {contenido}
        </button>
      ) : (
        <div className={claseCelda}>{contenido}</div>
      )}
    </div>
  );
}

function FiltroSelect({
  etiqueta,
  valor,
  onValueChange,
  opciones
}: {
  etiqueta: string;
  valor: string;
  onValueChange: (v: string) => void;
  opciones: [string, string][];
}) {
  return (
    <Select value={valor} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 gap-1.5 text-xs" aria-label={`Filtrar por ${etiqueta.toLowerCase()}`}>
        <span className="text-muted-foreground">{etiqueta}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos</SelectItem>
        {opciones.map(([v, label]) => (
          <SelectItem key={v} value={v}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Referencia({ clase, texto }: { clase: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("h-2.5 w-4 rounded-[3px]", clase)} />
      {texto}
    </span>
  );
}

function ReferenciaHito({ clase, texto }: { clase: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("size-2.5 rotate-45 rounded-[2px]", clase)} />
      {texto}
    </span>
  );
}
