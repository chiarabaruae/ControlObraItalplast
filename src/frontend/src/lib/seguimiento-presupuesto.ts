import {
  nombreCortoTipoProducto,
  type ConfiguracionProductoProyecto,
  type GrupoTareaPresupuesto,
  type ItemPresupuesto,
  type TareaPresupuesto,
  type TipoProducto
} from "@/mocks/data";
import { calcularFechasBackward, type BuffersPlanificacion } from "@/lib/planificacion";

export const gruposDeProducto = (producto: ConfiguracionProductoProyecto) => [
  { grupo: "fabricacion_premarcos" as const, etapas: producto.etapasFabricacionPremarcos },
  { grupo: "instalacion_premarcos" as const, etapas: producto.etapasInstalacionPremarcos },
  { grupo: "fabrica" as const, etapas: producto.etapasFabrica },
  { grupo: "instalacion" as const, etapas: producto.etapasObra }
];

export function generarTareasDesdePresupuesto(
  productos: ConfiguracionProductoProyecto[],
  items: ItemPresupuesto[],
  buffers?: BuffersPlanificacion
): TareaPresupuesto[] {
  return productos.flatMap((producto) => {
    if (producto.tipo === "servicios") return [];
    const itemsProducto = items.filter((item) => item.tipoProducto === producto.tipo);
    const fechasEstimadas = calcularFechasBackward(producto.planificacion, buffers);
    return gruposDeProducto(producto).flatMap(({ grupo, etapas }) => {
      const rango = fechasEstimadas?.porGrupo[grupo];
      return itemsProducto.flatMap((item) =>
        etapas.map((etapa) => ({
          id: `${producto.tipo}-${grupo}-${item.id}-${etapa.nombre}`,
          itemId: item.id,
          tipoProducto: producto.tipo,
          grupo,
          etapa: etapa.nombre,
          fechaInicio: rango?.inicio,
          fechaFin: rango?.fin,
          prioridad: "media" as const,
          creadaEn: new Date().toISOString(),
          version: 1,
          completada: false
        }))
      );
    });
  });
}

export function porcentajeTareas(tareas: TareaPresupuesto[], grupos?: GrupoTareaPresupuesto[]) {
  const filtradas = grupos ? tareas.filter((tarea) => grupos.includes(tarea.grupo)) : tareas;
  if (filtradas.length === 0) return 0;
  return Math.round((filtradas.filter((tarea) => tarea.completada).length / filtradas.length) * 100);
}

const SUFIJOS_BLOQUE: Record<GrupoTareaPresupuesto, string> = {
  fabricacion_premarcos: "Premarcos · fabricación",
  instalacion_premarcos: "Premarcos · instalación",
  fabrica: "Fabricación",
  instalacion: "Instalación",
  generales: "General"
};

/**
 * Etiqueta de bloque con el producto real (ej. "PVC · Fabricación") en vez del
 * genérico "Producto · fabricación", para distinguir tareas de distintos
 * productos dentro del mismo proyecto multiproducto. Las tareas genéricas del
 * proyecto (grupo "generales") no tienen producto: "Proyecto · General".
 */
export function etiquetaBloque(grupo: GrupoTareaPresupuesto, tipoProducto: TipoProducto) {
  if (grupo === "generales") return "Proyecto · General";
  return `${nombreCortoTipoProducto(tipoProducto)} · ${SUFIJOS_BLOQUE[grupo]}`;
}

/** Explicación breve de cada etapa, para el tooltip de ayuda del detalle de proyecto. */
const DESCRIPCIONES_GRUPO: Record<GrupoTareaPresupuesto, string> = {
  fabricacion_premarcos:
    "Construcción en planta de los premarcos: los marcos que se colocan primero en el vano para dejarlo a nivel y escuadra antes de instalar la abertura.",
  instalacion_premarcos:
    "Colocación de los premarcos en obra, fijándolos a plomo y escuadra en cada vano para recibir después la abertura.",
  fabrica:
    "Producción de la abertura en planta: corte de perfiles, armado, colocación de vidrios y control de calidad antes de despachar a obra.",
  instalacion:
    "Montaje final de la abertura en obra sobre el premarco, con ajustes, sellado y terminación.",
  generales:
    "Gestiones del proyecto que no dependen de fábrica ni instalación: trámites, permisos, coordinaciones y otras tareas administrativas."
};

export function descripcionGrupo(grupo: GrupoTareaPresupuesto) {
  return DESCRIPCIONES_GRUPO[grupo];
}

