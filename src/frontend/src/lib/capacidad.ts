// Topes de capacidad de producción (D-033): aberturas/día que la operación puede
// sostener, para comparar contra la demanda agregada en el cronograma general.
// La fábrica se topea por línea de producto (PVC y aluminio son líneas distintas);
// la instalación es un único tope (cuadrillas).

import type { TipoProducto } from "@/mocks/data";

export interface TopesCapacidad {
  /** aberturas/día que cada línea de producto puede fabricar, por tipo de producto. */
  fabrica: Record<string, number>;
  /** aberturas/día que las cuadrillas pueden instalar (global, sin distinguir producto). */
  instalacion: number;
  /** aberturas/día de fabricación de premarcos (carga operativa propia). */
  premarcosFabricacion?: number;
  /** aberturas/día de instalación de premarcos. */
  premarcosInstalacion?: number;
}

export const TOPE_FABRICA_PREDETERMINADO = 6;
export const TOPE_INSTALACION_PREDETERMINADO = 10;
export const TOPE_PREMARCOS_FABRICACION_PREDETERMINADO = 8;
export const TOPE_PREMARCOS_INSTALACION_PREDETERMINADO = 12;

const CAPACIDAD_STORAGE_KEY = "control-obras-capacidad";

const TOPES_PREDETERMINADOS: TopesCapacidad = {
  fabrica: {},
  instalacion: TOPE_INSTALACION_PREDETERMINADO
};

export function obtenerTopesCapacidad(): TopesCapacidad {
  if (typeof window === "undefined") return TOPES_PREDETERMINADOS;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CAPACIDAD_STORAGE_KEY) ?? "null") as Partial<TopesCapacidad> | null;
    if (!parsed) return TOPES_PREDETERMINADOS;
    return {
      fabrica: parsed.fabrica ?? {},
      instalacion: typeof parsed.instalacion === "number" ? parsed.instalacion : TOPE_INSTALACION_PREDETERMINADO,
      premarcosFabricacion: parsed.premarcosFabricacion,
      premarcosInstalacion: parsed.premarcosInstalacion
    };
  } catch {
    return TOPES_PREDETERMINADOS;
  }
}

export function guardarTopesCapacidad(topes: TopesCapacidad) {
  window.localStorage.setItem(CAPACIDAD_STORAGE_KEY, JSON.stringify(topes));
}

/** Tope diario de fábrica para una línea de producto (cae al predeterminado si no se configuró). */
export function topeFabrica(tipo: TipoProducto, topes: TopesCapacidad = obtenerTopesCapacidad()): number {
  const valor = topes.fabrica[String(tipo)];
  return typeof valor === "number" && valor > 0 ? valor : TOPE_FABRICA_PREDETERMINADO;
}

/** Tope diario de instalación (global). */
export function topeInstalacion(topes: TopesCapacidad = obtenerTopesCapacidad()): number {
  return topes.instalacion > 0 ? topes.instalacion : TOPE_INSTALACION_PREDETERMINADO;
}

/** Tope diario de fabricación de premarcos. */
export function topePremarcosFabricacion(topes: TopesCapacidad = obtenerTopesCapacidad()): number {
  const valor = topes.premarcosFabricacion;
  return typeof valor === "number" && valor > 0 ? valor : TOPE_PREMARCOS_FABRICACION_PREDETERMINADO;
}

/** Tope diario de instalación de premarcos. */
export function topePremarcosInstalacion(topes: TopesCapacidad = obtenerTopesCapacidad()): number {
  const valor = topes.premarcosInstalacion;
  return typeof valor === "number" && valor > 0 ? valor : TOPE_PREMARCOS_INSTALACION_PREDETERMINADO;
}
