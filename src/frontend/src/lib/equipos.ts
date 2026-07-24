// Equipos / cuadrillas (D-036): agrupan personas (fábrica u obra) y se asignan a
// proyectos. Solo los integrantes de los equipos de un proyecto —más los recursos
// adicionales vigentes— pueden recibir tareas de ese proyecto. Mock/localStorage.

import type { Vigencia } from "@/lib/permisos-usuario";

export type TipoEquipo = "fabrica" | "obra";

export const TIPO_EQUIPO_LABEL: Record<TipoEquipo, string> = {
  fabrica: "Fábrica",
  obra: "Obra"
};

export interface RecursoAdicionalEquipo {
  usuarioId: string;
  motivo: string;
  vigencia: Vigencia;
}

export interface Equipo {
  id: string;
  nombre: string;
  tipo: TipoEquipo;
  encargadoId: string;
  miembrosIds: string[];
  proyectoIds: string[];
  recursos: RecursoAdicionalEquipo[];
}

const STORAGE_KEY = "control-obras-equipos";

export function equiposPredeterminados(): Equipo[] {
  return [
    { id: "eq-obra-norte", nombre: "Cuadrilla Obra — Zona Norte", tipo: "obra", encargadoId: "u-belen", miembrosIds: ["u-oscar", "u-walter"], proyectoIds: [], recursos: [] },
    { id: "eq-fab-pvc", nombre: "Línea de fábrica — PVC", tipo: "fabrica", encargadoId: "u-juan", miembrosIds: ["u-walter"], proyectoIds: [], recursos: [] }
  ];
}

export function obtenerEquipos(): Equipo[] {
  if (typeof window === "undefined") return equiposPredeterminados();
  const guardado = window.localStorage.getItem(STORAGE_KEY);
  if (guardado === null) return equiposPredeterminados();
  try {
    const parsed = JSON.parse(guardado);
    if (Array.isArray(parsed)) return parsed as Equipo[];
  } catch {
    // cae a la semilla
  }
  return equiposPredeterminados();
}

export function guardarEquipos(equipos: Equipo[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(equipos));
}

function vigenciaVigente(vigencia: Vigencia, hoy = new Date().toISOString().slice(0, 10)): boolean {
  return vigencia.tipo === "permanente" || vigencia.hasta >= hoy;
}

export function equiposDeProyecto(proyectoId: string, equipos: Equipo[] = obtenerEquipos()): Equipo[] {
  return equipos.filter((equipo) => equipo.proyectoIds.includes(proyectoId));
}

/** Ids habilitados para recibir tareas del proyecto. null = sin equipos ⇒ sin restricción. */
export function idsAsignablesEnProyecto(proyectoId: string): Set<string> | null {
  const equipos = equiposDeProyecto(proyectoId);
  if (!equipos.length) return null;
  const ids = new Set<string>();
  for (const equipo of equipos) {
    if (equipo.encargadoId) ids.add(equipo.encargadoId);
    equipo.miembrosIds.forEach((id) => ids.add(id));
    equipo.recursos.filter((r) => vigenciaVigente(r.vigencia)).forEach((r) => ids.add(r.usuarioId));
  }
  return ids;
}
