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
  email?: string;
  telefono?: string;
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

export type TipoProducto =
  | "aberturas_aluminio"
  | "aberturas_pvc"
  | "mosquiteras"
  | "persianas"
  | "aberturas_velux"
  | "servicios";

export const TIPOS_PRODUCTO: { valor: TipoProducto; label: string }[] = [
  { valor: "aberturas_aluminio", label: "Aberturas de aluminio" },
  { valor: "aberturas_pvc", label: "Aberturas de PVC" },
  { valor: "mosquiteras", label: "Mosquiteras" },
  { valor: "persianas", label: "Persianas" },
  { valor: "aberturas_velux", label: "Aberturas Velux de techo" },
  { valor: "servicios", label: "Servicios" }
];

export function nombreTipoProducto(tipo?: TipoProducto) {
  return TIPOS_PRODUCTO.find((opcion) => opcion.valor === tipo)?.label ?? "Producto no especificado";
}

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
  tipo: "oferta" | "presupuesto" | "plano" | "otro";
  fecha: string;
  tamano: string;
}

export type FormatoPresupuesto = "tabla_excel" | "preference" | "preference_mercosul" | "desconocido";

export interface ItemPresupuesto {
  id: string;
  posicion: string;
  codigo: string;
  ambiente: string;
  cantidad: number;
  ancho: number;
  alto: number;
  descripcion: string;
  serie: string;
  color: string;
  vidrio: string;
  tipoProducto: TipoProducto;
}

export interface PresupuestoEjecutivo {
  nombreArchivo: string;
  tamano: number;
  formato: FormatoPresupuesto;
  numero: string;
  fecha: string;
  importadoEn: string;
  items: ItemPresupuesto[];
}

export type GrupoTareaPresupuesto =
  | "fabricacion_premarcos"
  | "instalacion_premarcos"
  | "fabrica"
  | "instalacion";

export interface EvidenciaTarea {
  nombre: string;
  tipo: string;
  tamano: number;
  dataUrl: string;
}

export interface TareaPresupuesto {
  id: string;
  /** Vacío en tareas manuales agregadas por el supervisor. */
  itemId: string;
  tipoProducto: TipoProducto;
  grupo: GrupoTareaPresupuesto;
  etapa: string;
  /** Nombre visible editable; si falta se arma con etapa + código del ítem. */
  titulo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  /** true cuando la agregó una persona (no nació del presupuesto). */
  manual?: boolean;
  completada: boolean;
  evidencia?: EvidenciaTarea;
  observaciones?: string;
  completadaEn?: string;
  completadaPorId?: string;
}

export interface RegistroPausa {
  fecha: string;
  usuarioId: string;
  motivo: string;
  reanudadaEn?: string;
  reanudadaPorId?: string;
  motivoReanudacion?: string;
}

export interface RegistroCierre {
  fecha: string;
  usuarioId: string;
  evidenciaGeneral?: EvidenciaTarea;
  reabiertoEn?: string;
  reabiertoPorId?: string;
  motivoReapertura?: string;
}

export interface RegistroCancelacion {
  fecha: string;
  usuarioId: string;
  motivo: string;
  reactivadaEn?: string;
  reactivadaPorId?: string;
  motivoReactivacion?: string;
}

export interface RegistroCambioEstado {
  fecha: string;
  usuarioId: string;
  origen: EstadoObra;
  destino: EstadoObra;
  motivo?: string;
}

export interface ConfiguracionProductoProyecto {
  tipo: TipoProducto;
  etapasFabricacionPremarcos: EtapaSeguimiento[];
  etapasInstalacionPremarcos: EtapaSeguimiento[];
  etapasFabrica: EtapaSeguimiento[];
  etapasObra: EtapaSeguimiento[];
}

export interface Proyecto {
  id: string;
  nombre: string;
  clienteId: string;
  ubicacion: string;
  liderId: string;
  productos?: ConfiguracionProductoProyecto[];
  /** Compatibilidad temporal con proyectos creados antes de permitir múltiples productos. */
  tipoProducto?: TipoProducto;
  estado: EstadoObra;
  fechaCreacion?: string;
  fechaInicio: string;
  fechaFinEstimada: string;
  avanceFabrica: number;
  avanceObra: number;
  etapasFabricacionPremarcos: EtapaSeguimiento[];
  etapasInstalacionPremarcos: EtapaSeguimiento[];
  etapasFabrica: EtapaSeguimiento[];
  etapasObra: EtapaSeguimiento[];
  aberturas: Abertura[];
  cronograma: HitoCronograma[];
  documentos: Documento[];
  presupuestoEjecutivo?: PresupuestoEjecutivo;
  tareasPresupuesto?: TareaPresupuesto[];
  /** Historial de pausas: cada cambio a "pausada" exige un motivo. */
  pausas?: RegistroPausa[];
  /** Registro del cierre manual desde el tablero (avances al 100%). */
  cierre?: RegistroCierre;
  /** Cancelación vigente o histórica, siempre con motivo. */
  cancelacion?: RegistroCancelacion;
  /** Auditoría de cambios manuales y automáticos de estado. */
  historialEstados?: RegistroCambioEstado[];
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
export const ETAPAS_FABRICACION_PREMARCOS = [
  "Relevamiento y medición de vanos",
  "Despiece y preparación de materiales",
  "Corte y armado de premarcos",
  "Control dimensional",
  "Preparación para entrega"
];
export const ETAPAS_INSTALACION_PREMARCOS = [
  "Coordinación de instalación",
  "Traslado a obra",
  "Presentación y nivelación",
  "Fijación de premarcos",
  "Control final de plomo y nivel"
];

export function etapas(nombres: string[], avances: number[]): EtapaSeguimiento[] {
  return nombres.map((nombre, i) => ({ nombre, avance: avances[i] ?? 0 }));
}

// ── Proyectos ───────────────────────────────────────────────────
const proyectosBase: Proyecto[] = [
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
    etapasFabricacionPremarcos: [],
    etapasInstalacionPremarcos: [],
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
      { nombre: "Presupuesto ejecutivo rev3.pdf", tipo: "presupuesto", fecha: "2026-04-27", tamano: "310 KB" },
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
    etapasFabricacionPremarcos: [],
    etapasInstalacionPremarcos: [],
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
      { nombre: "Presupuesto ejecutivo 10 dúplex.pdf", tipo: "presupuesto", fecha: "2026-06-05", tamano: "204 KB" }
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
    etapasFabricacionPremarcos: [],
    etapasInstalacionPremarcos: [],
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
    etapasFabricacionPremarcos: [],
    etapasInstalacionPremarcos: [],
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

const ETAPAS_DEMO_PREMARCO_FABRICA = etapas([
  "Relevamiento de vanos",
  "Corte y armado",
  "Control de medidas"
], [0, 0, 0]);

const ETAPAS_DEMO_PREMARCO_INSTALACION = etapas([
  "Coordinación de entrega",
  "Colocación y nivelación"
], [0, 0]);

const EVIDENCIA_DEMO_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <rect width="960" height="540" fill="#0060AF"/>
    <rect x="54" y="54" width="852" height="432" rx="28" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-opacity="0.45" stroke-width="3"/>
    <text x="480" y="250" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="48" font-weight="700">ITALPLAST</text>
    <text x="480" y="315" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="26">Evidencia demostrativa</text>
  </svg>
`)}`;

function fechaInterpolada(inicio: string, fin: string, indice: number, total: number) {
  const inicioMs = new Date(`${inicio}T00:00:00Z`).getTime();
  const finMs = new Date(`${fin || inicio}T00:00:00Z`).getTime();
  const proporcion = total <= 1 ? 1 : indice / (total - 1);
  return new Date(inicioMs + (finMs - inicioMs) * proporcion).toISOString().slice(0, 10);
}

function crearSeguimientoDemostrativo(proyecto: Proyecto): Proyecto {
  const tipos = [...new Set(proyecto.aberturas.map((abertura) =>
    abertura.material === "PVC" ? "aberturas_pvc" as const : "aberturas_aluminio" as const
  ))];
  const productos: ConfiguracionProductoProyecto[] = tipos.map((tipo) => {
    const llevaPremarcos = proyecto.id === "p-aviadores" && tipo === "aberturas_aluminio";
    return {
      tipo,
      etapasFabricacionPremarcos: llevaPremarcos ? ETAPAS_DEMO_PREMARCO_FABRICA : [],
      etapasInstalacionPremarcos: llevaPremarcos ? ETAPAS_DEMO_PREMARCO_INSTALACION : [],
      etapasFabrica: proyecto.etapasFabrica,
      etapasObra: proyecto.etapasObra
    };
  });
  const items: ItemPresupuesto[] = proyecto.aberturas.map((abertura, indice) => ({
    id: `demo-${proyecto.id}-${abertura.codigo.toLocaleLowerCase()}`,
    posicion: String(indice + 1),
    codigo: abertura.codigo,
    ambiente: indice % 2 === 0 ? "Sector principal" : "Sector secundario",
    cantidad: abertura.cantidad,
    ancho: abertura.ancho,
    alto: abertura.alto,
    descripcion: abertura.descripcion,
    serie: abertura.material === "PVC" ? "Línea PVC demostrativa" : "Línea aluminio demostrativa",
    color: abertura.material === "PVC" ? "Blanco" : "Negro microtexturado",
    vidrio: "Según presupuesto ejecutivo",
    tipoProducto: abertura.material === "PVC" ? "aberturas_pvc" : "aberturas_aluminio"
  }));
  const tareasSinEstado = productos.flatMap((producto) => {
    const itemsProducto = items.filter((item) => item.tipoProducto === producto.tipo);
    const grupos = [
      { grupo: "fabricacion_premarcos" as const, etapas: producto.etapasFabricacionPremarcos },
      { grupo: "instalacion_premarcos" as const, etapas: producto.etapasInstalacionPremarcos },
      { grupo: "fabrica" as const, etapas: producto.etapasFabrica },
      { grupo: "instalacion" as const, etapas: producto.etapasObra }
    ];
    return grupos.flatMap(({ grupo, etapas: etapasGrupo }) =>
      itemsProducto.flatMap((item) => etapasGrupo.map((etapa) => ({
        id: `demo-${proyecto.id}-${producto.tipo}-${grupo}-${item.id}-${etapa.nombre}`,
        itemId: item.id,
        tipoProducto: producto.tipo,
        grupo,
        etapa: etapa.nombre,
        completada: false
      })))
    );
  });
  const tareasPresupuesto: TareaPresupuesto[] = tareasSinEstado.map((tarea, indice, todas) => {
    const avanceObjetivo = tarea.grupo === "fabrica" || tarea.grupo === "fabricacion_premarcos"
      ? proyecto.avanceFabrica
      : proyecto.avanceObra;
    const grupo = todas.filter((actual) =>
      actual.grupo === tarea.grupo && actual.tipoProducto === tarea.tipoProducto
    );
    const indiceGrupo = grupo.findIndex((actual) => actual.id === tarea.id);
    const cantidadCompletada = Math.round(grupo.length * avanceObjetivo / 100);
    const completada = proyecto.estado === "finalizada" || indiceGrupo < cantidadCompletada;
    const fechaFin = fechaInterpolada(proyecto.fechaInicio, proyecto.fechaFinEstimada, indice, todas.length);
    return {
      ...tarea,
      fechaInicio: proyecto.fechaInicio,
      fechaFin,
      completada,
      evidencia: completada ? {
        nombre: "evidencia-demostrativa.svg",
        tipo: "image/svg+xml",
        tamano: 1024,
        dataUrl: EVIDENCIA_DEMO_DATA_URL
      } : undefined,
      observaciones: completada ? "Dato ficticio para visualizar el flujo de seguimiento." : undefined,
      completadaEn: completada ? `${fechaFin}T15:00:00.000Z` : undefined,
      completadaPorId: completada ? proyecto.liderId : undefined
    };
  });
  const documentoPresupuesto = proyecto.documentos.find((documento) => documento.tipo === "presupuesto");

  return {
    ...proyecto,
    productos,
    presupuestoEjecutivo: {
      nombreArchivo: documentoPresupuesto?.nombre ?? `Presupuesto ejecutivo demo — ${proyecto.nombre}.pdf`,
      tamano: 0,
      formato: "desconocido",
      numero: `DEMO-${proyecto.id.replace("p-", "").toLocaleUpperCase()}`,
      fecha: documentoPresupuesto?.fecha ?? proyecto.fechaInicio,
      importadoEn: `${proyecto.fechaInicio}T12:00:00.000Z`,
      items
    },
    tareasPresupuesto
  };
}

/** Proyectos mock enriquecidos para poder recorrer el seguimiento por checks sin cargar PDFs reales. */
export const proyectos: Proyecto[] = proyectosBase.map(crearSeguimientoDemostrativo);

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
  if (p.tareasPresupuesto?.length) {
    const completadas = p.tareasPresupuesto.filter((tarea) => tarea.completada).length;
    return Math.round((completadas / p.tareasPresupuesto.length) * 100);
  }
  return Math.round(p.avanceFabrica * 0.5 + p.avanceObra * 0.5);
}

export function avanceGrupo(p: Proyecto, grupos: GrupoTareaPresupuesto[], respaldo: number): number {
  const tareas = p.tareasPresupuesto?.filter((tarea) => grupos.includes(tarea.grupo)) ?? [];
  if (tareas.length === 0) return respaldo;
  return Math.round((tareas.filter((tarea) => tarea.completada).length / tareas.length) * 100);
}

/** Nombre visible de una tarea de seguimiento (editable por el supervisor). */
export function tituloTarea(tarea: TareaPresupuesto, p?: Proyecto): string {
  if (tarea.titulo?.trim()) return tarea.titulo;
  const item = p?.presupuestoEjecutivo?.items.find((actual) => actual.id === tarea.itemId);
  const referencia = item ? (item.codigo || `Pos. ${item.posicion}`) : "";
  return referencia ? `${tarea.etapa} — ${referencia}` : tarea.etapa;
}

export function proyectoTieneAvance(p: Proyecto): boolean {
  return (p.tareasPresupuesto?.some((tarea) => tarea.completada) ?? false) || avanceGeneral(p) > 0;
}

export function contarEvidencias(p: Proyecto): number {
  const enTareas = p.tareasPresupuesto?.filter((tarea) => tarea.evidencia).length ?? 0;
  return enTareas + (p.cierre?.evidenciaGeneral ? 1 : 0);
}

export function registrarCambioEstado(
  proyecto: Proyecto,
  destino: EstadoObra,
  usuarioId: string,
  motivo?: string
): Proyecto {
  if (proyecto.estado === destino) return proyecto;
  return {
    ...proyecto,
    estado: destino,
    historialEstados: [
      ...(proyecto.historialEstados ?? []),
      {
        fecha: new Date().toISOString(),
        usuarioId,
        origen: proyecto.estado,
        destino,
        motivo: motivo?.trim() || undefined
      }
    ]
  };
}

/**
 * Aplica el cambio de una tarea de seguimiento y las reglas de estado:
 * un proyecto planificado pasa solo a "en progreso" con su primer avance.
 */
export function aplicarCambioTarea(p: Proyecto, tareaActualizada: TareaPresupuesto): Proyecto {
  const actualizado: Proyecto = {
    ...p,
    tareasPresupuesto: (p.tareasPresupuesto ?? []).map((tarea) =>
      tarea.id === tareaActualizada.id ? tareaActualizada : tarea
    )
  };
  if (actualizado.estado === "planificada" && proyectoTieneAvance(actualizado)) {
    return registrarCambioEstado(
      actualizado,
      "en_progreso",
      tareaActualizada.completadaPorId ?? "sistema",
      "Primer avance registrado"
    );
  }
  return actualizado;
}

const PROYECTOS_STORAGE_KEY = "control-obras-proyectos";

export function obtenerProyectos(): Proyecto[] {
  if (typeof window === "undefined") return proyectos;
  const guardados = window.localStorage.getItem(PROYECTOS_STORAGE_KEY);
  if (!guardados) return proyectos;

  try {
    const parsed = JSON.parse(guardados) as Proyecto[];
    return Array.isArray(parsed)
      ? parsed.map((proyecto) => {
          const demostrativo = proyectos.find((actual) => actual.id === proyecto.id);
          const etapasFabricacionPremarcos = proyecto.etapasFabricacionPremarcos ?? [];
          const etapasInstalacionPremarcos = proyecto.etapasInstalacionPremarcos ?? [];
          const productosMigrados = proyecto.productos ?? (proyecto.tipoProducto
            ? [{
                tipo: proyecto.tipoProducto,
                etapasFabricacionPremarcos,
                etapasInstalacionPremarcos,
                etapasFabrica: proyecto.etapasFabrica ?? [],
                etapasObra: proyecto.etapasObra ?? []
              }]
            : []);
          const productos = productosMigrados.length > 0
            ? productosMigrados
            : (demostrativo?.productos ?? []);
          const documentos = (proyecto.documentos ?? []).map((documento) => {
            const tiposVigentes = ["oferta", "presupuesto", "plano", "otro"];
            return tiposVigentes.includes(String(documento.tipo))
              ? documento
              : { ...documento, nombre: "Presupuesto ejecutivo (documento migrado)", tipo: "presupuesto" as const };
          });

          return {
            ...proyecto,
            productos,
            documentos,
            etapasFabricacionPremarcos,
            etapasInstalacionPremarcos,
            presupuestoEjecutivo: proyecto.presupuestoEjecutivo ?? demostrativo?.presupuestoEjecutivo,
            tareasPresupuesto: proyecto.tareasPresupuesto?.length
              ? proyecto.tareasPresupuesto
              : (demostrativo?.tareasPresupuesto ?? [])
          };
        })
      : proyectos;
  } catch {
    return proyectos;
  }
}

export function guardarProyectos(lista: Proyecto[]) {
  window.localStorage.setItem(PROYECTOS_STORAGE_KEY, JSON.stringify(lista));
}

export function guardarProyecto(proyectoActualizado: Proyecto) {
  const lista = obtenerProyectos().map((proyecto) =>
    proyecto.id === proyectoActualizado.id ? proyectoActualizado : proyecto
  );
  guardarProyectos(lista);
}
