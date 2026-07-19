// Datos mock — Fase 2. Sin llamadas a /api: todo local.
// Nombres reales del seed de usuarios; obras/clientes ficticios pero verosímiles.
import type { Role } from "@/lib/roles";

export interface Usuario {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  department: string;
  positionTitle: string;
  isActive: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  ruc: string;
  telefono: string;
  email: string;
  contacto: string;
  estado: "activo" | "inactivo";
  proyectos: number;
}

export type EstadoObra = "planificada" | "en_progreso" | "pausada" | "finalizada" | "cancelada";

export interface EtapaSeguimiento {
  nombre: string;
  avance: number; // 0-100
}

export interface Abertura {
  codigo: string;
  descripcion: string;
  material: "PVC" | "ALU";
  cantidad: number;
  ancho: number;
  alto: number;
}

export interface HitoCronograma {
  etapa: string;
  inicio: string;
  fin: string;
}

export interface Documento {
  nombre: string;
  tipo: "oferta" | "abaco" | "plano" | "otro";
  fecha: string;
  tamano: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  clienteId: string;
  ubicacion: string;
  liderId: string;
  estado: EstadoObra;
  fechaCreacion?: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  avanceFabrica: number;
  avanceObra: number;
  etapasFabrica: EtapaSeguimiento[];
  etapasObra: EtapaSeguimiento[];
  aberturas: Abertura[];
  cronograma: HitoCronograma[];
  documentos: Documento[];
  descripcion: string;
}

export interface Tarea {
  id: string;
  proyectoId: string;
  titulo: string;
  responsableId: string;
  fechaFin: string;
  estado: "pendiente" | "en_progreso" | "bloqueada" | "finalizada";
  prioridad: "baja" | "media" | "alta" | "urgente";
}

// ── Usuarios (subset del seed real) ─────────────────────────────
export const usuarios: Usuario[] = [
  { id: "u-emilio", username: "2319471", displayName: "Emilio Fernández", role: "administrator", department: "Gerencia", positionTitle: "Gerencia General", isActive: true },
  { id: "u-cristian", username: "4123251", displayName: "Cristian Gopaldas", role: "administrator", department: "Proyectos", positionTitle: "Jefe de Proyectos", isActive: true },
  { id: "u-belen", username: "3748633", displayName: "María Belén Ortiz", role: "supervisor", department: "Obra", positionTitle: "Jefa de Obras", isActive: true },
  { id: "u-marcelo", username: "5923833", displayName: "Marcelo Fleitas", role: "supervisor", department: "Obra", positionTitle: "Encargado de Cuadrillas", isActive: true },
  { id: "u-cristhian", username: "5445820", displayName: "Cristhian Romero", role: "supervisor", department: "Fábrica", positionTitle: "Encargado Producc. ALU", isActive: true },
  { id: "u-juan", username: "5445798", displayName: "Juan Casco", role: "supervisor", department: "Fábrica", positionTitle: "Encargado Producc. PVC", isActive: true },
  { id: "u-walter", username: "6500067", displayName: "Walter Alonso", role: "viewer", department: "Fábrica", positionTitle: "Operario Producción PVC", isActive: true },
  { id: "u-oscar", username: "5017916", displayName: "Oscar Casco", role: "viewer", department: "Obra", positionTitle: "Auxiliar de Obra", isActive: true },
  { id: "u-veronica", username: "5960688", displayName: "Verónica Gaona", role: "viewer", department: "Administración", positionTitle: "Asistente Administrativo", isActive: true },
  { id: "u-natanahel", username: "4045897", displayName: "Natanahel Falcón", role: "viewer", department: "Comercial", positionTitle: "Jefe Comercial", isActive: false }
];

// Usuarios de acceso rápido en el login mock
export const usuariosDemo: Record<Role, Usuario> = {
  administrator: usuarios[0],
  supervisor: usuarios[2],
  viewer: usuarios[7]
};

// ── Clientes ────────────────────────────────────────────────────
export const clientes: Cliente[] = [
  { id: "c-itapua", nombre: "Constructora Itapúa S.A.", ruc: "80012345-6", telefono: "+595 21 555 0101", email: "obras@citapua.com.py", contacto: "Arq. Rossana Benítez", estado: "activo", proyectos: 2 },
  { id: "c-este", nombre: "Desarrollos del Este", ruc: "80098765-1", telefono: "+595 61 500 244", email: "compras@desarrolloseste.com.py", contacto: "Ing. Fabio Martínez", estado: "activo", proyectos: 1 },
  { id: "c-barrail", nombre: "Barrail Hermanos", ruc: "80054321-9", telefono: "+595 21 606 060", email: "proyectos@barrail.com.py", contacto: "Lic. Carmen Duarte", estado: "activo", proyectos: 1 },
  { id: "c-vazquez", nombre: "Ing. Vázquez & Asociados", ruc: "80031415-2", telefono: "+595 981 415 926", email: "silvio@vazquezasoc.com.py", contacto: "Ing. Silvio Vázquez", estado: "inactivo", proyectos: 0 }
];

// ── Etapas estándar ─────────────────────────────────────────────
export const ETAPAS_FABRICA = ["Corte de perfiles", "Soldadura", "Limpieza", "Herrajes", "Vidriado", "Control y embalaje"];
export const ETAPAS_FABRICA_OPCIONALES = ["Precorte"];
export const ETAPAS_OBRA = ["Medición en obra", "Preparación de vanos", "Colocación de marcos", "Colocación de hojas", "Ajuste y sellado"];

export function etapas(nombres: string[], avances: number[]): EtapaSeguimiento[] {
  return nombres.map((nombre, i) => ({ nombre, avance: avances[i] ?? 0 }));
}

// ── Proyectos ───────────────────────────────────────────────────
export const proyectos: Proyecto[] = [
  {
    id: "p-aviadores",
    nombre: "Torre Aviadores",
    clienteId: "c-itapua",
    ubicacion: "Avda. Aviadores del Chaco, Asunción",
    liderId: "u-belen",
    estado: "en_progreso",
    fechaInicio: "2026-05-04",
    fechaFinEstimada: "2026-09-30",
    avanceFabrica: 72,
    avanceObra: 38,
    etapasFabrica: etapas(ETAPAS_FABRICA, [100, 100, 95, 70, 45, 20]),
    etapasObra: etapas(ETAPAS_OBRA, [100, 80, 10, 0, 0]),
    aberturas: [
      { codigo: "V-01", descripcion: "Ventana corrediza 2 hojas", material: "PVC", cantidad: 48, ancho: 1500, alto: 1200 },
      { codigo: "V-02", descripcion: "Ventana batiente baño", material: "PVC", cantidad: 24, ancho: 600, alto: 600 },
      { codigo: "P-01", descripcion: "Puerta balcón corrediza", material: "ALU", cantidad: 24, ancho: 2100, alto: 2200 },
      { codigo: "M-01", descripcion: "Mampara fija hall", material: "ALU", cantidad: 2, ancho: 3200, alto: 2600 }
    ],
    cronograma: [
      { etapa: "Producción fábrica", inicio: "2026-05-04", fin: "2026-08-14" },
      { etapa: "Medición y preparación", inicio: "2026-06-01", fin: "2026-07-10" },
      { etapa: "Instalación en obra", inicio: "2026-07-13", fin: "2026-09-18" },
      { etapa: "Ajustes y entrega", inicio: "2026-09-21", fin: "2026-09-30" }
    ],
    documentos: [
      { nombre: "Oferta 2026-041 Torre Aviadores.pdf", tipo: "oferta", fecha: "2026-04-18", tamano: "2,4 MB" },
      { nombre: "Ábaco de aberturas rev3.xlsx", tipo: "abaco", fecha: "2026-04-27", tamano: "310 KB" },
      { nombre: "Planos vanos torre A.pdf", tipo: "plano", fecha: "2026-05-06", tamano: "8,1 MB" }
    ],
    descripcion: "98 aberturas PVC y ALU para torre residencial de 14 pisos. Incluye mamparas de hall y barandas de balcón."
  },
  {
    id: "p-ykua",
    nombre: "Residencial Ykua Sati",
    clienteId: "c-barrail",
    ubicacion: "Ykua Sati, Asunción",
    liderId: "u-marcelo",
    estado: "en_progreso",
    fechaInicio: "2026-06-10",
    fechaFinEstimada: "2026-08-28",
    avanceFabrica: 34,
    avanceObra: 0,
    etapasFabrica: etapas(ETAPAS_FABRICA, [90, 55, 40, 15, 0, 0]),
    etapasObra: etapas(ETAPAS_OBRA, [60, 0, 0, 0, 0]),
    aberturas: [
      { codigo: "V-01", descripcion: "Ventana corrediza dormitorio", material: "PVC", cantidad: 30, ancho: 1400, alto: 1100 },
      { codigo: "P-01", descripcion: "Puerta principal batiente", material: "ALU", cantidad: 10, ancho: 900, alto: 2100 }
    ],
    cronograma: [
      { etapa: "Producción fábrica", inicio: "2026-06-10", fin: "2026-07-31" },
      { etapa: "Instalación en obra", inicio: "2026-08-03", fin: "2026-08-24" },
      { etapa: "Entrega", inicio: "2026-08-25", fin: "2026-08-28" }
    ],
    documentos: [
      { nombre: "Oferta 2026-058 Ykua Sati.pdf", tipo: "oferta", fecha: "2026-05-29", tamano: "1,8 MB" },
      { nombre: "Ábaco 10 duplex.xlsx", tipo: "abaco", fecha: "2026-06-05", tamano: "204 KB" }
    ],
    descripcion: "40 aberturas para 10 dúplex. Producción por tandas de 2 unidades."
  },
  {
    id: "p-nasaindy",
    nombre: "Edificio Ñasaindy",
    clienteId: "c-este",
    ubicacion: "Villa Morra, Asunción",
    liderId: "u-belen",
    estado: "pausada",
    fechaInicio: "2026-04-01",
    fechaFinEstimada: "2026-10-15",
    avanceFabrica: 58,
    avanceObra: 12,
    etapasFabrica: etapas(ETAPAS_FABRICA, [100, 85, 70, 40, 25, 0]),
    etapasObra: etapas(ETAPAS_OBRA, [45, 15, 0, 0, 0]),
    aberturas: [
      { codigo: "V-01", descripcion: "Paño fijo + corrediza living", material: "ALU", cantidad: 36, ancho: 2800, alto: 1400 },
      { codigo: "V-02", descripcion: "Ventana cocina proyectante", material: "ALU", cantidad: 18, ancho: 1000, alto: 500 }
    ],
    cronograma: [
      { etapa: "Producción fábrica", inicio: "2026-04-01", fin: "2026-07-17" },
      { etapa: "Instalación en obra", inicio: "2026-07-20", fin: "2026-10-02" },
      { etapa: "Entrega", inicio: "2026-10-05", fin: "2026-10-15" }
    ],
    documentos: [
      { nombre: "Oferta 2026-033 Ñasaindy.pdf", tipo: "oferta", fecha: "2026-03-12", tamano: "3,1 MB" }
    ],
    descripcion: "Obra pausada por adenda del cliente: cambio de vidrio DVH en pisos 8-12. Retoma estimada la primera semana de agosto."
  },
  {
    id: "p-lambare",
    nombre: "Dúplex Lambaré",
    clienteId: "c-itapua",
    ubicacion: "Lambaré, Central",
    liderId: "u-marcelo",
    estado: "finalizada",
    fechaInicio: "2026-02-02",
    fechaFinEstimada: "2026-04-24",
    avanceFabrica: 100,
    avanceObra: 100,
    etapasFabrica: etapas(ETAPAS_FABRICA, [100, 100, 100, 100, 100, 100]),
    etapasObra: etapas(ETAPAS_OBRA, [100, 100, 100, 100, 100]),
    aberturas: [
      { codigo: "V-01", descripcion: "Ventana corrediza estándar", material: "PVC", cantidad: 16, ancho: 1200, alto: 1000 }
    ],
    cronograma: [
      { etapa: "Producción fábrica", inicio: "2026-02-02", fin: "2026-03-13" },
      { etapa: "Instalación en obra", inicio: "2026-03-16", fin: "2026-04-17" },
      { etapa: "Entrega", inicio: "2026-04-20", fin: "2026-04-24" }
    ],
    documentos: [
      { nombre: "Oferta 2026-011 Lambaré.pdf", tipo: "oferta", fecha: "2026-01-15", tamano: "1,2 MB" },
      { nombre: "Acta de entrega firmada.pdf", tipo: "otro", fecha: "2026-04-24", tamano: "650 KB" }
    ],
    descripcion: "Entregada sin observaciones. Acta firmada el 24/04."
  }
];

// ── Tareas ──────────────────────────────────────────────────────
export const tareasIniciales: Tarea[] = [
  { id: "t-1", proyectoId: "p-aviadores", titulo: "Verificar medidas de vanos piso 3", responsableId: "u-oscar", fechaFin: "2026-07-21", estado: "en_progreso", prioridad: "alta" },
  { id: "t-2", proyectoId: "p-aviadores", titulo: "Coordinar izaje de vidrios DVH", responsableId: "u-belen", fechaFin: "2026-07-24", estado: "pendiente", prioridad: "urgente" },
  { id: "t-3", proyectoId: "p-aviadores", titulo: "Reponer burletes faltantes lote V-01", responsableId: "u-walter", fechaFin: "2026-07-22", estado: "pendiente", prioridad: "media" },
  { id: "t-4", proyectoId: "p-ykua", titulo: "Confirmar color de herrajes con cliente", responsableId: "u-marcelo", fechaFin: "2026-07-20", estado: "bloqueada", prioridad: "alta" },
  { id: "t-5", proyectoId: "p-ykua", titulo: "Programar corte tanda 3 (dúplex 5-6)", responsableId: "u-juan", fechaFin: "2026-07-23", estado: "pendiente", prioridad: "media" },
  { id: "t-6", proyectoId: "p-nasaindy", titulo: "Presupuestar adenda vidrio DVH pisos 8-12", responsableId: "u-cristian", fechaFin: "2026-07-31", estado: "en_progreso", prioridad: "alta" },
  { id: "t-7", proyectoId: "p-aviadores", titulo: "Limpieza final balcones bloque B", responsableId: "u-oscar", fechaFin: "2026-07-18", estado: "finalizada", prioridad: "baja" }
];

// ── Helpers ─────────────────────────────────────────────────────
export function clientePorId(id: string) {
  return clientes.find((c) => c.id === id);
}
export function usuarioPorId(id: string) {
  return usuarios.find((u) => u.id === id);
}
export function proyectoPorId(id: string) {
  return obtenerProyectos().find((p) => p.id === id);
}
export function avanceGeneral(p: Proyecto): number {
  return Math.round(p.avanceFabrica * 0.5 + p.avanceObra * 0.5);
}

const PROYECTOS_STORAGE_KEY = "control-obras-proyectos";

export function obtenerProyectos(): Proyecto[] {
  if (typeof window === "undefined") return proyectos;
  const guardados = window.localStorage.getItem(PROYECTOS_STORAGE_KEY);
  if (!guardados) return proyectos;

  try {
    const parsed = JSON.parse(guardados) as Proyecto[];
    return Array.isArray(parsed) ? parsed : proyectos;
  } catch {
    return proyectos;
  }
}

export function guardarProyectos(lista: Proyecto[]) {
  window.localStorage.setItem(PROYECTOS_STORAGE_KEY, JSON.stringify(lista));
}
