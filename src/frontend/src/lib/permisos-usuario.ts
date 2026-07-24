// Permisos por acción (D-035): excepciones por usuario que SOLO otorgan de más
// sobre su rol, con motivo y vigencia (permanente o temporal). El evaluador
// central puede(user, accion) combina el rol base con las excepciones vigentes.
// El rol TI ya es omnipotente por el proxy de lib/roles.

import { permisos, type Role } from "@/lib/roles";
import type { Usuario } from "@/mocks/data";

export type AccionOtorgable =
  | "crearProyecto"
  | "cambiarEstadoProyecto"
  | "cancelarProyecto"
  | "reabrirProyecto"
  | "gestionarClientes"
  | "subirOferta"
  | "gestionarPresupuesto"
  | "crearTarea"
  | "editarTarea"
  | "eliminarTarea"
  | "definirPrioridadTarea";

export const ACCIONES_OTORGABLES: { clave: AccionOtorgable; label: string; descripcion: string }[] = [
  { clave: "crearProyecto", label: "Crear proyecto", descripcion: "Dar de alta nuevos proyectos." },
  { clave: "cambiarEstadoProyecto", label: "Mover proyecto de estado", descripcion: "Mover proyectos en el tablero." },
  { clave: "cancelarProyecto", label: "Cancelar proyecto", descripcion: "Cancelar un proyecto." },
  { clave: "reabrirProyecto", label: "Reabrir proyecto", descripcion: "Reabrir un proyecto cerrado." },
  { clave: "gestionarClientes", label: "Gestionar clientes", descripcion: "Crear y editar clientes." },
  { clave: "subirOferta", label: "Subir oferta", descripcion: "Cargar la oferta de un proyecto." },
  { clave: "gestionarPresupuesto", label: "Gestionar presupuesto", descripcion: "Editar el presupuesto ejecutivo." },
  { clave: "crearTarea", label: "Crear tarea", descripcion: "Crear tareas de seguimiento." },
  { clave: "editarTarea", label: "Editar tarea", descripcion: "Editar tareas de seguimiento." },
  { clave: "eliminarTarea", label: "Retirar tarea", descripcion: "Retirar tareas de seguimiento." },
  { clave: "definirPrioridadTarea", label: "Definir prioridad", descripcion: "Cambiar la prioridad de tareas." }
];

export const LABEL_ACCION = Object.fromEntries(
  ACCIONES_OTORGABLES.map((a) => [a.clave, a.label])
) as Record<AccionOtorgable, string>;

export type Vigencia = { tipo: "permanente" } | { tipo: "temporal"; hasta: string };

export interface PermisoOverride {
  accion: AccionOtorgable;
  motivo: string;
  vigencia: Vigencia;
  otorgadoPorId: string;
  otorgadoEn: string;
}

const STORAGE_KEY = "control-obras-permisos-usuario";
type MapaOverrides = Record<string, PermisoOverride[]>;

function leerMapa(): MapaOverrides {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    return parsed && typeof parsed === "object" ? (parsed as MapaOverrides) : {};
  } catch {
    return {};
  }
}

function guardarMapa(mapa: MapaOverrides) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
}

export function obtenerOverrides(usuarioId: string): PermisoOverride[] {
  return leerMapa()[usuarioId] ?? [];
}

export function guardarOverrides(usuarioId: string, overrides: PermisoOverride[]) {
  const mapa = leerMapa();
  if (overrides.length) mapa[usuarioId] = overrides;
  else delete mapa[usuarioId];
  guardarMapa(mapa);
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function overrideVigente(override: PermisoOverride, hoy: string = hoyISO()): boolean {
  return override.vigencia.tipo === "permanente" || override.vigencia.hasta >= hoy;
}

export function tieneOverride(usuarioId: string, accion: AccionOtorgable): boolean {
  return obtenerOverrides(usuarioId).some((o) => o.accion === accion && overrideVigente(o));
}

/** Evaluador central: rol base + excepciones vigentes. Las excepciones solo suman. */
export function puede(user: Usuario | null | undefined, accion: AccionOtorgable): boolean {
  if (!user) return false;
  if (permisos[accion](user.role)) return true;
  return tieneOverride(user.id, accion);
}

/** Acciones que el rol todavía NO tiene, y por ende tiene sentido otorgar como excepción. */
export function accionesOtorgablesPara(rol: Role): AccionOtorgable[] {
  return ACCIONES_OTORGABLES.filter((a) => !permisos[a.clave](rol)).map((a) => a.clave);
}
