// Derivación del cronograma general (D-033): a partir de la planificación
// backward de cada producto (D-023) arma las filas del Gantt (una por
// proyecto × producto), sus segmentos por etapa, los hitos y la carga
// diaria de aberturas para comparar contra la capacidad instalada.

import { calcularFechasBackward } from "@/lib/planificacion";
import type { ConfiguracionProductoProyecto, Proyecto, TipoProducto } from "@/mocks/data";

export type TipoSegmento = "fabricacion_premarcos" | "instalacion_premarcos" | "fabrica" | "instalacion";

export interface SegmentoGantt {
  tipo: TipoSegmento;
  inicio: string;
  fin: string;
}

export interface HitoGantt {
  /** "firma" = Firma de Presupuesto Ejecutivo; "cliente" = confirmación de medidas del cliente. */
  tipo: "firma" | "cliente";
  fecha: string;
}

export interface FilaCronograma {
  proyecto: Proyecto;
  tipoProducto: TipoProducto;
  totalAberturas: number;
  segmentos: SegmentoGantt[];
  hitos: HitoGantt[];
  firma?: string;
  /** aberturas/día repartidas linealmente en la ventana de fábrica. */
  fabricaPorDia: number;
  /** aberturas/día repartidas linealmente en la ventana de instalación. */
  instalacionPorDia: number;
}

/** Productos del proyecto, con compatibilidad para el modelo legado `tipoProducto`. */
export function productosDeProyecto(proyecto: Proyecto): ConfiguracionProductoProyecto[] {
  if (proyecto.productos?.length) return proyecto.productos;
  if (proyecto.tipoProducto) {
    return [{
      tipo: proyecto.tipoProducto,
      etapasFabricacionPremarcos: proyecto.etapasFabricacionPremarcos,
      etapasInstalacionPremarcos: proyecto.etapasInstalacionPremarcos,
      etapasFabrica: proyecto.etapasFabrica,
      etapasObra: proyecto.etapasObra
    }];
  }
  return [];
}

export function totalAberturasProducto(proyecto: Proyecto, tipo: TipoProducto): number {
  return (proyecto.presupuestoEjecutivo?.items ?? [])
    .filter((item) => item.tipoProducto === tipo)
    .reduce((suma, item) => suma + item.cantidad, 0);
}

/**
 * Fila del Gantt para un producto operativo. Devuelve `null` cuando el producto
 * es Servicios o cuando no tiene planificación cargada (sin compromiso de fecha).
 */
export function filaCronograma(proyecto: Proyecto, producto: ConfiguracionProductoProyecto): FilaCronograma | null {
  if (producto.tipo === "servicios") return null;
  const fechas = calcularFechasBackward(producto.planificacion);
  if (!fechas) return null;

  const segmentos: SegmentoGantt[] = [];
  const agregar = (tipo: TipoSegmento, rango?: { inicio: string; fin: string }) => {
    if (rango) segmentos.push({ tipo, inicio: rango.inicio, fin: rango.fin });
  };
  agregar("fabricacion_premarcos", fechas.porGrupo.fabricacion_premarcos);
  agregar("instalacion_premarcos", fechas.porGrupo.instalacion_premarcos);
  agregar("fabrica", fechas.porGrupo.fabrica);
  agregar("instalacion", fechas.porGrupo.instalacion);

  const hitos: HitoGantt[] = [];
  if (fechas.firmaAbaco) hitos.push({ tipo: "firma", fecha: fechas.firmaAbaco });
  // Confirmación del cliente: al inicio de la cadena de premarcos (cuando existe).
  const confirmacion = fechas.inicioFabricacionPremarcos ?? fechas.entregaPremarcos;
  if (confirmacion) hitos.push({ tipo: "cliente", fecha: confirmacion });

  const total = totalAberturasProducto(proyecto, producto.tipo);
  const diasFabrica = producto.planificacion?.diasFabrica ?? 0;
  const diasInstalacion = producto.planificacion?.diasInstalacion ?? 0;

  return {
    proyecto,
    tipoProducto: producto.tipo,
    totalAberturas: total,
    segmentos,
    hitos,
    firma: fechas.firmaAbaco,
    fabricaPorDia: diasFabrica > 0 ? Math.ceil(total / diasFabrica) : 0,
    instalacionPorDia: diasInstalacion > 0 ? Math.ceil(total / diasInstalacion) : 0
  };
}

/** Producto operativo sin planificación cargada, para la sección "Sin compromiso". */
export interface ProductoSinCompromiso {
  proyecto: Proyecto;
  tipoProducto: TipoProducto;
  totalAberturas: number;
}

export interface CronogramaGeneral {
  filas: FilaCronograma[];
  sinCompromiso: ProductoSinCompromiso[];
}

export function construirCronograma(proyectos: Proyecto[]): CronogramaGeneral {
  const filas: FilaCronograma[] = [];
  const sinCompromiso: ProductoSinCompromiso[] = [];
  for (const proyecto of proyectos) {
    // El cronograma se enfoca en el trabajo comprometido y por venir.
    if (proyecto.estado === "cancelada" || proyecto.estado === "finalizada") continue;
    for (const producto of productosDeProyecto(proyecto)) {
      if (producto.tipo === "servicios") continue;
      const fila = filaCronograma(proyecto, producto);
      if (fila) {
        filas.push(fila);
      } else {
        sinCompromiso.push({
          proyecto,
          tipoProducto: producto.tipo,
          totalAberturas: totalAberturasProducto(proyecto, producto.tipo)
        });
      }
    }
  }
  return { filas, sinCompromiso };
}

/**
 * Fecha de firma del Presupuesto Ejecutivo a nivel proyecto: la más temprana
 * (más restrictiva) entre sus productos operativos. Un presupuesto por proyecto
 * mezcla PVC y aluminio y comparten el hito.
 */
export function firmaPresupuestoProyecto(productos: ConfiguracionProductoProyecto[]): string | undefined {
  const fechas = productos
    .filter((producto) => producto.tipo !== "servicios")
    .map((producto) => calcularFechasBackward(producto.planificacion)?.firmaAbaco)
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort();
  return fechas[0];
}

/** Demanda de aberturas/día en una fecha: por línea de producto en fábrica y total en instalación. */
export function demandaDiaria(filas: FilaCronograma[], fechaISO: string): { fabrica: Record<string, number>; instalacion: number } {
  const fabrica: Record<string, number> = {};
  let instalacion = 0;
  for (const fila of filas) {
    const enFabrica = fila.segmentos.find((seg) => seg.tipo === "fabrica");
    if (enFabrica && fechaISO >= enFabrica.inicio && fechaISO <= enFabrica.fin) {
      fabrica[String(fila.tipoProducto)] = (fabrica[String(fila.tipoProducto)] ?? 0) + fila.fabricaPorDia;
    }
    const enInstalacion = fila.segmentos.find((seg) => seg.tipo === "instalacion");
    if (enInstalacion && fechaISO >= enInstalacion.inicio && fechaISO <= enInstalacion.fin) {
      instalacion += fila.instalacionPorDia;
    }
  }
  return { fabrica, instalacion };
}
