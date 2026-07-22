// Planificación backward de fechas — fuente: cronograma de fábrica (Excel).
// Desde la fecha comprometida de inicio de instalación se derivan, hacia atrás,
// las demás fechas usando duraciones por bloque y brechas (buffers) configurables.

import type { GrupoTareaPresupuesto, PlanificacionProducto } from "@/mocks/data";

export interface BuffersPlanificacion {
  /** Días entre el fin de producción y el inicio de instalación. */
  diasProduccionAInstalacion: number;
  /** Días entre la firma del ábaco y la entrada a fábrica. */
  diasAbacoAFabrica: number;
  /** Días entre la entrega de premarcos en obra y la firma del ábaco. */
  diasPremarcosAAbaco: number;
}

export const BUFFERS_PREDETERMINADOS: BuffersPlanificacion = {
  diasProduccionAInstalacion: 3,
  diasAbacoAFabrica: 1,
  diasPremarcosAAbaco: 3
};

const BUFFERS_STORAGE_KEY = "control-obras-planificacion";

export function obtenerBuffersPlanificacion(): BuffersPlanificacion {
  if (typeof window === "undefined") return BUFFERS_PREDETERMINADOS;
  const guardados = window.localStorage.getItem(BUFFERS_STORAGE_KEY);
  if (!guardados) return BUFFERS_PREDETERMINADOS;
  try {
    const parsed = JSON.parse(guardados) as Partial<BuffersPlanificacion>;
    return { ...BUFFERS_PREDETERMINADOS, ...parsed };
  } catch {
    return BUFFERS_PREDETERMINADOS;
  }
}

export function guardarBuffersPlanificacion(buffers: BuffersPlanificacion) {
  window.localStorage.setItem(BUFFERS_STORAGE_KEY, JSON.stringify(buffers));
}

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
  firmaAbaco?: string;
  entregaPremarcos?: string;
  inicioFabricacionPremarcos?: string;
  porGrupo: Partial<Record<GrupoTareaPresupuesto, RangoFechas>>;
}

/**
 * Reproduce el cálculo backward del cronograma de fábrica:
 * fin producción = inicio instalación − brecha; inicio fábrica = fin producción − días fábrica;
 * firma ábaco = inicio fábrica − brecha; entrega premarcos = firma ábaco − brecha;
 * inicio premarcos = entrega − días premarcos.
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

  const inicioFabrica = sumarDias(finProduccion, -plan.diasFabrica);
  const firmaAbaco = sumarDias(inicioFabrica, -buffers.diasAbacoAFabrica);
  const entregaPremarcos = sumarDias(firmaAbaco, -buffers.diasPremarcosAAbaco);
  porGrupo.fabrica = { inicio: inicioFabrica, fin: finProduccion };
  porGrupo.instalacion_premarcos = { inicio: entregaPremarcos, fin: firmaAbaco };
  resultado.inicioFabrica = inicioFabrica;
  resultado.firmaAbaco = firmaAbaco;
  resultado.entregaPremarcos = entregaPremarcos;

  if (plan.diasFabricacionPremarcos && plan.diasFabricacionPremarcos > 0) {
    const inicioFabricacionPremarcos = sumarDias(entregaPremarcos, -plan.diasFabricacionPremarcos);
    porGrupo.fabricacion_premarcos = { inicio: inicioFabricacionPremarcos, fin: entregaPremarcos };
    resultado.inicioFabricacionPremarcos = inicioFabricacionPremarcos;
  }

  return resultado;
}
