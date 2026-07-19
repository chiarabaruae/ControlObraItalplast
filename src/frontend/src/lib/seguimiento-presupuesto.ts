import type {
  ConfiguracionProductoProyecto,
  GrupoTareaPresupuesto,
  ItemPresupuesto,
  TareaPresupuesto
} from "@/mocks/data";

const gruposDeProducto = (producto: ConfiguracionProductoProyecto) => [
  { grupo: "fabricacion_premarcos" as const, etapas: producto.etapasFabricacionPremarcos },
  { grupo: "instalacion_premarcos" as const, etapas: producto.etapasInstalacionPremarcos },
  { grupo: "fabrica" as const, etapas: producto.etapasFabrica },
  { grupo: "instalacion" as const, etapas: producto.etapasObra }
];

export function generarTareasDesdePresupuesto(
  productos: ConfiguracionProductoProyecto[],
  items: ItemPresupuesto[]
): TareaPresupuesto[] {
  return productos.flatMap((producto) => {
    if (producto.tipo === "servicios") return [];
    const itemsProducto = items.filter((item) => item.tipoProducto === producto.tipo);
    return gruposDeProducto(producto).flatMap(({ grupo, etapas }) =>
      itemsProducto.flatMap((item) =>
        etapas.map((etapa) => ({
          id: `${producto.tipo}-${grupo}-${item.id}-${etapa.nombre}`,
          itemId: item.id,
          tipoProducto: producto.tipo,
          grupo,
          etapa: etapa.nombre,
          completada: false
        }))
      )
    );
  });
}

export function porcentajeTareas(tareas: TareaPresupuesto[], grupos?: GrupoTareaPresupuesto[]) {
  const filtradas = grupos ? tareas.filter((tarea) => grupos.includes(tarea.grupo)) : tareas;
  if (filtradas.length === 0) return 0;
  return Math.round((filtradas.filter((tarea) => tarea.completada).length / filtradas.length) * 100);
}

export const ETIQUETAS_GRUPO: Record<GrupoTareaPresupuesto, string> = {
  fabricacion_premarcos: "Premarcos · fabricación",
  instalacion_premarcos: "Premarcos · instalación",
  fabrica: "Producto · fabricación",
  instalacion: "Producto · instalación"
};

