// Notificaciones (D-038): se derivan del estado vivo de los datos (tareas,
// proyectos, permisos) según el rol del usuario. No hay bus de eventos en el
// mock, así que la campana refleja siempre la realidad actual. El estado
// "visto" se guarda por usuario en localStorage.

import { obtenerProyectos, tituloTarea, usuarios, type Usuario } from "@/mocks/data";
import { obtenerOverrides, overrideVigente } from "@/lib/permisos-usuario";
import { formatFecha } from "@/lib/format";

export type NivelNotif = "personal" | "supervision" | "gobernanza";

export interface Notificacion {
  id: string;
  nivel: NivelNotif;
  titulo: string;
  detalle?: string;
  enlace?: string;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumarDiasISO(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

function contarExcepcionesVigentes(): number {
  return usuarios.reduce(
    (total, usuario) => total + obtenerOverrides(usuario.id).filter((o) => overrideVigente(o)).length,
    0
  );
}

/** Construye las notificaciones relevantes para el usuario según su rol. */
export function construirNotificaciones(user: Usuario): Notificacion[] {
  const proyectos = obtenerProyectos();
  const hoy = hoyISO();
  const limiteProximas = sumarDiasISO(hoy, 3);
  const notifs: Notificacion[] = [];

  // Personales: tareas asignadas al usuario, vencidas o próximas a vencer.
  for (const proyecto of proyectos) {
    for (const tarea of proyecto.tareasPresupuesto ?? []) {
      if (tarea.completada || tarea.responsableId !== user.id || !tarea.fechaFin) continue;
      if (tarea.fechaFin < hoy) {
        notifs.push({
          id: `venc-${tarea.id}`,
          nivel: "personal",
          titulo: "Tarea vencida",
          detalle: `${tituloTarea(tarea, proyecto)} · ${proyecto.nombre} · venció ${formatFecha(tarea.fechaFin)}`,
          enlace: `/proyectos/${proyecto.id}`
        });
      } else if (tarea.fechaFin <= limiteProximas) {
        notifs.push({
          id: `prox-${tarea.id}`,
          nivel: "personal",
          titulo: "Entrega próxima",
          detalle: `${tituloTarea(tarea, proyecto)} · ${proyecto.nombre} · ${formatFecha(tarea.fechaFin)}`,
          enlace: `/proyectos/${proyecto.id}`
        });
      }
    }
  }

  // Supervisión: para supervisor (sus proyectos, por liderId) y admin/TI (todos).
  if (user.role !== "viewer") {
    const alcance = proyectos.filter((p) => (user.role === "supervisor" ? p.liderId === user.id : true));
    let vencidas = 0;
    let sinAsignar = 0;
    for (const proyecto of alcance) {
      for (const tarea of proyecto.tareasPresupuesto ?? []) {
        if (tarea.completada) continue;
        if (tarea.fechaFin && tarea.fechaFin < hoy) vencidas += 1;
        if (!tarea.responsableId) sinAsignar += 1;
      }
    }
    if (vencidas > 0) {
      notifs.push({
        id: `sup-vencidas-${vencidas}`,
        nivel: "supervision",
        titulo: `${vencidas} ${vencidas === 1 ? "tarea vencida" : "tareas vencidas"}`,
        detalle: user.role === "supervisor" ? "En los proyectos que supervisás." : "En todos los proyectos.",
        enlace: "/tareas"
      });
    }
    if (sinAsignar > 0) {
      notifs.push({
        id: `sup-sinasignar-${sinAsignar}`,
        nivel: "supervision",
        titulo: `${sinAsignar} ${sinAsignar === 1 ? "tarea sin asignar" : "tareas sin asignar"}`,
        detalle: "Falta definir responsable.",
        enlace: "/tareas"
      });
    }
  }

  // Gobernanza: solo administración y TI.
  if (user.role === "administrator" || user.role === "ti") {
    const excepciones = contarExcepcionesVigentes();
    if (excepciones > 0) {
      notifs.push({
        id: `gob-excepciones-${excepciones}`,
        nivel: "gobernanza",
        titulo: `${excepciones} ${excepciones === 1 ? "excepción de permiso vigente" : "excepciones de permiso vigentes"}`,
        detalle: "Permisos por acción otorgados sobre el rol.",
        enlace: "/usuarios"
      });
    }
  }

  return notifs;
}

// ── Estado "visto" por usuario ──────────────────────────────────
const VISTAS_KEY = "control-obras-notif-vistas";
type MapaVistas = Record<string, string[]>;

function leerVistas(): MapaVistas {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VISTAS_KEY) ?? "null");
    return parsed && typeof parsed === "object" ? (parsed as MapaVistas) : {};
  } catch {
    return {};
  }
}

export function idsVistos(usuarioId: string): Set<string> {
  return new Set(leerVistas()[usuarioId] ?? []);
}

export function marcarVistos(usuarioId: string, ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;
  const mapa = leerVistas();
  const previos = new Set(mapa[usuarioId] ?? []);
  ids.forEach((id) => previos.add(id));
  // Se conservan las últimas 300 para no inflar el almacenamiento.
  mapa[usuarioId] = [...previos].slice(-300);
  window.localStorage.setItem(VISTAS_KEY, JSON.stringify(mapa));
}
