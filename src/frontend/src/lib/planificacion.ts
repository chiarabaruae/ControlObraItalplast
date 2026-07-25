// Planificación backward de fechas — fuente: cronograma de fábrica (Excel).
// Desde la fecha comprometida de inicio de instalación se derivan, hacia atrás,
// las demás fechas usando duraciones por bloque y brechas (buffers) configurables.
//
// Motor de reglas (D-034): las brechas dejaron de estar fijas. El administrador
// gestiona una lista de reglas de planificación de tres tipos —hito, bloque y
// brecha— desde la página Reglas. El solver lee las brechas del núcleo desde esas
// reglas manteniendo el shape FechasEstimadas para no romper el cronograma general.

import type { GrupoTareaPresupuesto, PlanificacionProducto } from "@/mocks/data";

// ===================== Reglas de planificación =====================

export type TipoRegla = "hito" | "bloque" | "brecha";

/** Claves estables de las reglas del núcleo que el solver reconoce. */
export type ClaveReglaNucleo =
  | "hito_confirmacion_cliente"
  | "brecha_confirmacion_fabricacion"
  | "bloque_fabricacion_premarcos"
  | "brecha_premarcos_fab_inst"
  | "bloque_instalacion_premarcos"
  | "brecha_instpremarcos_relevamiento"
  | "hito_relevamiento_tecnico"
  | "brecha_relevamiento_firma"
  | "hito_firma_abaco"
  | "brecha_abaco_fabrica"
  | "bloque_fabrica"
  | "brecha_produccion_instalacion"
  | "bloque_instalacion";

export interface ReglaPlanificacion {
  id: string;
  tipo: TipoRegla;
  nombre: string;
  descripcion?: string;
  /** Se aplica a todos los proyectos nuevos. */
  obligatoria: boolean;
  /** Preseleccionada al crear un proyecto (para reglas opcionales). */
  porDefecto: boolean;
  /** Núcleo mínimo: no se puede eliminar, solo ajustar. */
  protegida: boolean;
  /** Posición en la cadena; menor = más temprano en el tiempo. */
  orden: number;
  /** Brecha: días de separación. Bloque: los días se cargan por proyecto. */
  dias?: number;
  /** Referencias legibles de la junción (informativas, para brechas). */
  desde?: string;
  hasta?: string;
  /** Presente solo en reglas del núcleo que el solver conoce. */
  clave?: ClaveReglaNucleo;
}

export const REGLAS_STORAGE_KEY = "control-obras-reglas";
const BUFFERS_STORAGE_KEY = "control-obras-planificacion"; // formato viejo (para migrar)

function regla(orden: number, base: Omit<ReglaPlanificacion, "id" | "orden">): ReglaPlanificacion {
  return { id: base.clave ?? `regla-${orden}`, orden, ...base };
}

/** Semilla del núcleo, en orden temporal (confirmación → … → instalación). */
export function reglasPredeterminadas(): ReglaPlanificacion[] {
  return [
    regla(0, {
      clave: "hito_confirmacion_cliente", tipo: "hito", nombre: "Confirmación del cliente",
      descripcion: "El cliente confirma medidas al inicio de la cadena de premarcos.",
      obligatoria: true, porDefecto: true, protegida: true
    }),
    regla(1, {
      clave: "brecha_confirmacion_fabricacion", tipo: "brecha",
      nombre: "Confirmación del cliente → fabricación de premarcos",
      descripcion: "Al día siguiente de la confirmación del cliente ya arranca la fabricación de premarcos.",
      obligatoria: true, porDefecto: true, protegida: false, dias: 1,
      desde: "Confirmación del cliente", hasta: "Inicio fabricación de premarcos"
    }),
    regla(2, {
      clave: "bloque_fabricacion_premarcos", tipo: "bloque", nombre: "Fabricación de premarcos",
      descripcion: "Días de fabricación de premarcos. La duración se define por proyecto.",
      obligatoria: false, porDefecto: false, protegida: false
    }),
    regla(3, {
      clave: "brecha_premarcos_fab_inst", tipo: "brecha",
      nombre: "Fin fabricación premarcos → inicio instalación premarcos",
      descripcion: "La fabricación de premarcos debe terminar esta cantidad de días antes de instalarlos.",
      obligatoria: false, porDefecto: false, protegida: false, dias: 1,
      desde: "Fin fabricación de premarcos", hasta: "Inicio instalación de premarcos"
    }),
    regla(4, {
      clave: "bloque_instalacion_premarcos", tipo: "bloque", nombre: "Instalación de premarcos",
      descripcion: "Días de instalación de premarcos, propia o a cargo del cliente.",
      obligatoria: false, porDefecto: false, protegida: false
    }),
    regla(5, {
      clave: "brecha_instpremarcos_relevamiento", tipo: "brecha",
      nombre: "Fin instalación de premarcos → relevamiento técnico",
      descripcion: "El relevamiento técnico se hace un día después de terminar la instalación de premarcos.",
      obligatoria: true, porDefecto: true, protegida: false, dias: 1,
      desde: "Fin instalación de premarcos", hasta: "Relevamiento técnico"
    }),
    regla(6, {
      clave: "hito_relevamiento_tecnico", tipo: "hito", nombre: "Relevamiento técnico",
      descripcion: "Toma de medidas finales en obra. De acá salen las medidas definitivas del presupuesto.",
      obligatoria: true, porDefecto: true, protegida: true
    }),
    regla(7, {
      clave: "brecha_relevamiento_firma", tipo: "brecha",
      nombre: "Relevamiento técnico → firma de Presupuesto Ejecutivo",
      descripcion: "Con las medidas del relevamiento se cierra el presupuesto: dos días después se firma.",
      obligatoria: true, porDefecto: true, protegida: false, dias: 2,
      desde: "Relevamiento técnico", hasta: "Firma de Presupuesto Ejecutivo"
    }),
    regla(8, {
      clave: "hito_firma_abaco", tipo: "hito", nombre: "Firma de Presupuesto Ejecutivo",
      descripcion: "Bisagra entre relevamiento y fábrica; debe firmarse antes de entrar a fábrica.",
      obligatoria: true, porDefecto: true, protegida: true
    }),
    regla(9, {
      clave: "brecha_abaco_fabrica", tipo: "brecha", nombre: "Firma de Presupuesto Ejecutivo → entrada a fábrica",
      descripcion: "El presupuesto debe firmarse esta cantidad de días antes de que el pedido entre a fábrica.",
      obligatoria: true, porDefecto: true, protegida: false, dias: 1,
      desde: "Firma de Presupuesto Ejecutivo", hasta: "Entrada a fábrica"
    }),
    regla(10, {
      clave: "bloque_fabrica", tipo: "bloque", nombre: "Fabricación de aberturas",
      descripcion: "Días de producción en fábrica. La duración se define por proyecto.",
      obligatoria: true, porDefecto: true, protegida: true
    }),
    regla(11, {
      clave: "brecha_produccion_instalacion", tipo: "brecha", nombre: "Fin de producción → inicio de instalación",
      descripcion: "La producción debe terminar esta cantidad de días antes de comenzar la instalación.",
      obligatoria: true, porDefecto: true, protegida: false, dias: 3,
      desde: "Fin de producción", hasta: "Inicio de instalación"
    }),
    regla(12, {
      clave: "bloque_instalacion", tipo: "bloque", nombre: "Instalación de aberturas",
      descripcion: "Días de instalación en obra. La duración se define por proyecto.",
      obligatoria: true, porDefecto: true, protegida: true
    })
  ];
}

/**
 * Reincorpora las reglas del núcleo que falten y ordena por posición. Se suman
 * todas (no solo las protegidas) para que un conjunto guardado con una semilla
 * vieja incorpore los hitos y brechas nuevos en lugar de quedar incompleto.
 */
function normalizarReglas(reglas: ReglaPlanificacion[]): ReglaPlanificacion[] {
  const base = reglasPredeterminadas();
  const claves = new Set(reglas.map((r) => r.clave).filter(Boolean));
  const faltantes = base.filter((r) => r.clave && !claves.has(r.clave));
  return [...reglas, ...faltantes].sort((a, b) => a.orden - b.orden);
}

export function obtenerReglasPlanificacion(): ReglaPlanificacion[] {
  if (typeof window === "undefined") return reglasPredeterminadas();
  const guardadas = window.localStorage.getItem(REGLAS_STORAGE_KEY);
  if (guardadas) {
    try {
      const parsed = JSON.parse(guardadas) as ReglaPlanificacion[];
      if (Array.isArray(parsed) && parsed.length) return normalizarReglas(parsed);
    } catch {
      // cae a la semilla
    }
  }
  // Migración desde el formato viejo de brechas fijas.
  const base = reglasPredeterminadas();
  const viejo = window.localStorage.getItem(BUFFERS_STORAGE_KEY);
  if (viejo) {
    try {
      const b = JSON.parse(viejo) as Partial<Record<string, number>>;
      const setDias = (clave: ClaveReglaNucleo, valor?: number) => {
        if (typeof valor === "number" && valor >= 0) {
          const r = base.find((x) => x.clave === clave);
          if (r) r.dias = valor;
        }
      };
      setDias("brecha_produccion_instalacion", b.diasProduccionAInstalacion);
      setDias("brecha_abaco_fabrica", b.diasAbacoAFabrica);
    } catch {
      // ignora, usa defaults
    }
  }
  return base;
}

export function guardarReglasPlanificacion(reglas: ReglaPlanificacion[]) {
  window.localStorage.setItem(REGLAS_STORAGE_KEY, JSON.stringify(reglas));
}

export function puedeEliminarRegla(regla: ReglaPlanificacion): boolean {
  return !regla.protegida;
}

export interface AlertaRegla {
  nivel: "error" | "aviso";
  mensaje: string;
}

/** Valida el conjunto: mínimos presentes, brechas válidas y avisos de conflicto. */
export function validarReglas(reglas: ReglaPlanificacion[]): AlertaRegla[] {
  const alertas: AlertaRegla[] = [];
  const base = reglasPredeterminadas();
  const claves = new Set(reglas.map((r) => r.clave).filter(Boolean));

  for (const p of base.filter((r) => r.protegida)) {
    if (!claves.has(p.clave)) {
      alertas.push({
        nivel: "error",
        mensaje: `Falta la regla mínima "${p.nombre}". Sin ella la planificación backward no puede calcularse.`
      });
    }
  }

  for (const r of reglas) {
    if (!r.nombre.trim()) {
      alertas.push({ nivel: "error", mensaje: "Hay una regla sin nombre." });
    }
    if (r.tipo === "brecha" && (typeof r.dias !== "number" || !Number.isInteger(r.dias) || r.dias < 0)) {
      alertas.push({ nivel: "error", mensaje: `La brecha "${r.nombre || "sin nombre"}" necesita un número entero de días (0 o más).` });
    }
  }

  const totalBrechas = reglas
    .filter((r) => r.tipo === "brecha")
    .reduce((suma, r) => suma + (typeof r.dias === "number" ? r.dias : 0), 0);
  if (totalBrechas > 60) {
    alertas.push({
      nivel: "aviso",
      mensaje: `Las brechas suman ${totalBrechas} días; podrías estar empujando el inicio de fábrica demasiado atrás.`
    });
  }

  return alertas;
}

// ===================== Buffers derivados de las reglas =====================

export interface BuffersPlanificacion {
  /** Días entre el fin de producción y el inicio de instalación. */
  diasProduccionAInstalacion: number;
  /** Días entre la firma del Presupuesto Ejecutivo y la entrada a fábrica. */
  diasAbacoAFabrica: number;
  /** Días entre la entrega de premarcos en obra y la firma (compatibilidad). */
  diasPremarcosAAbaco: number;
  /** Días entre el fin de fabricación de premarcos y el inicio de su instalación. */
  diasPremarcosFabAInstalacion: number;
  /** Días entre la confirmación del cliente y el inicio de fabricación de premarcos. */
  diasConfirmacionAFabricacion: number;
  /** Días entre el fin de instalación de premarcos y el relevamiento técnico. */
  diasInstPremarcosARelevamiento: number;
  /** Días entre el relevamiento técnico y la firma del Presupuesto Ejecutivo. */
  diasRelevamientoAFirma: number;
}

export const BUFFERS_PREDETERMINADOS: BuffersPlanificacion = {
  diasProduccionAInstalacion: 3,
  diasAbacoAFabrica: 1,
  diasPremarcosAAbaco: 3,
  diasPremarcosFabAInstalacion: 1,
  diasConfirmacionAFabricacion: 1,
  diasInstPremarcosARelevamiento: 1,
  diasRelevamientoAFirma: 2
};

function diasDeRegla(reglas: ReglaPlanificacion[], clave: ClaveReglaNucleo, predeterminado: number): number {
  const encontrada = reglas.find((r) => r.clave === clave);
  return encontrada && typeof encontrada.dias === "number" && encontrada.dias >= 0 ? encontrada.dias : predeterminado;
}

/** Brechas del núcleo resueltas desde las reglas activas (con fallback al default). */
export function obtenerBuffersPlanificacion(
  reglas: ReglaPlanificacion[] = obtenerReglasPlanificacion()
): BuffersPlanificacion {
  return {
    diasProduccionAInstalacion: diasDeRegla(reglas, "brecha_produccion_instalacion", BUFFERS_PREDETERMINADOS.diasProduccionAInstalacion),
    diasAbacoAFabrica: diasDeRegla(reglas, "brecha_abaco_fabrica", BUFFERS_PREDETERMINADOS.diasAbacoAFabrica),
    // Legado: la cadena ahora pasa por el relevamiento técnico, no por esta brecha.
    diasPremarcosAAbaco: BUFFERS_PREDETERMINADOS.diasPremarcosAAbaco,
    diasPremarcosFabAInstalacion: diasDeRegla(reglas, "brecha_premarcos_fab_inst", BUFFERS_PREDETERMINADOS.diasPremarcosFabAInstalacion),
    diasConfirmacionAFabricacion: diasDeRegla(reglas, "brecha_confirmacion_fabricacion", BUFFERS_PREDETERMINADOS.diasConfirmacionAFabricacion),
    diasInstPremarcosARelevamiento: diasDeRegla(reglas, "brecha_instpremarcos_relevamiento", BUFFERS_PREDETERMINADOS.diasInstPremarcosARelevamiento),
    diasRelevamientoAFirma: diasDeRegla(reglas, "brecha_relevamiento_firma", BUFFERS_PREDETERMINADOS.diasRelevamientoAFirma)
  };
}

// ===================== Cálculo backward =====================

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export interface RangoFechas {
  inicio: string;
  fin: string;
}

export interface FechasEstimadas {
  finInstalacion: string;
  finProduccion: string;
  inicioFabrica?: string;
  /** Firma del Presupuesto Ejecutivo. */
  firmaAbaco?: string;
  /** Relevamiento técnico: medidas finales, un día después de los premarcos. */
  relevamientoTecnico?: string;
  /** Confirmación del cliente: arranca la cadena de premarcos. */
  confirmacionCliente?: string;
  entregaPremarcos?: string;
  inicioFabricacionPremarcos?: string;
  porGrupo: Partial<Record<GrupoTareaPresupuesto, RangoFechas>>;
}

/**
 * Reproduce el cálculo backward del cronograma de fábrica:
 * fin producción = inicio instalación − brecha; inicio fábrica = fin producción − días fábrica;
 * firma ábaco = inicio fábrica − brecha; entrega premarcos = firma ábaco − brecha;
 * fin fabricación premarcos = entrega − brecha fab→inst; inicio = fin − días fab. premarcos.
 */
export function calcularFechasBackward(
  plan: PlanificacionProducto | undefined,
  buffers: BuffersPlanificacion = obtenerBuffersPlanificacion()
): FechasEstimadas | undefined {
  if (!plan?.fechaInicioInstalacion) return undefined;

  const inicioInstalacion = plan.fechaInicioInstalacion;
  const finInstalacion = sumarDias(inicioInstalacion, Math.max(plan.diasInstalacion ?? 1, 1) - 1);
  const finProduccion = sumarDias(inicioInstalacion, -buffers.diasProduccionAInstalacion);

  const porGrupo: FechasEstimadas["porGrupo"] = {
    instalacion: { inicio: inicioInstalacion, fin: finInstalacion }
  };
  const resultado: FechasEstimadas = { finInstalacion, finProduccion, porGrupo };

  if (!plan.diasFabrica || plan.diasFabrica <= 0) return resultado;

  // Cadena hacia atrás: fábrica ← firma ← relevamiento ← premarcos ← confirmación.
  const inicioFabrica = sumarDias(finProduccion, -plan.diasFabrica);
  const firmaAbaco = sumarDias(inicioFabrica, -buffers.diasAbacoAFabrica);
  const relevamientoTecnico = sumarDias(firmaAbaco, -buffers.diasRelevamientoAFirma);
  porGrupo.fabrica = { inicio: inicioFabrica, fin: finProduccion };
  resultado.inicioFabrica = inicioFabrica;
  resultado.firmaAbaco = firmaAbaco;
  resultado.relevamientoTecnico = relevamientoTecnico;

  // El relevamiento se hace un día después de terminar la instalación de premarcos.
  const finInstalacionPremarcos = sumarDias(relevamientoTecnico, -buffers.diasInstPremarcosARelevamiento);
  resultado.entregaPremarcos = finInstalacionPremarcos;

  // Punto donde termina la cadena de premarcos y arranca lo anterior.
  let anclaPremarcos = finInstalacionPremarcos;
  const diasInstPremarcos = plan.diasInstalacionPremarcos && plan.diasInstalacionPremarcos > 0
    ? plan.diasInstalacionPremarcos
    : 0;
  if (diasInstPremarcos > 0) {
    const inicioInstalacionPremarcos = sumarDias(finInstalacionPremarcos, -diasInstPremarcos);
    porGrupo.instalacion_premarcos = { inicio: inicioInstalacionPremarcos, fin: finInstalacionPremarcos };
    anclaPremarcos = sumarDias(inicioInstalacionPremarcos, -buffers.diasPremarcosFabAInstalacion);
  }

  if (plan.diasFabricacionPremarcos && plan.diasFabricacionPremarcos > 0) {
    const inicioFabricacionPremarcos = sumarDias(anclaPremarcos, -plan.diasFabricacionPremarcos);
    porGrupo.fabricacion_premarcos = { inicio: inicioFabricacionPremarcos, fin: anclaPremarcos };
    resultado.inicioFabricacionPremarcos = inicioFabricacionPremarcos;
    resultado.confirmacionCliente = sumarDias(inicioFabricacionPremarcos, -buffers.diasConfirmacionAFabricacion);
  } else {
    resultado.confirmacionCliente = sumarDias(anclaPremarcos, -buffers.diasConfirmacionAFabricacion);
  }

  return resultado;
}
