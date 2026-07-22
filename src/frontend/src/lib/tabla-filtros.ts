// Orden y filtro por columna, al estilo de una planilla.
// Cada tabla declara qué texto representa cada columna (para filtrar) y,
// si hace falta, con qué clave se ordena (fechas o números).
import { useState } from "react";

export type Direccion = "asc" | "desc";

/** Define cómo se nombran las opciones de orden en el menú de la columna. */
export type TipoColumna = "texto" | "numero" | "fecha";

export interface DefinicionColumna<T> {
  /** Texto visible de la celda: es lo que se lista en el filtro. */
  valor: (fila: T) => string;
  /** Clave de orden cuando el texto no ordena bien (fechas, números). */
  orden?: (fila: T) => string | number;
  /** Texto por defecto: cambia las etiquetas de orden del menú. */
  tipo?: TipoColumna;
}

type Columnas<T> = Record<string, ((fila: T) => string) | DefinicionColumna<T>>;

export interface ControlTabla<T> {
  filas: T[];
  estadoColumna: (clave: string) => {
    direccion: Direccion | null;
    seleccionados: string[];
    disponibles: string[];
    activo: boolean;
    tipo: TipoColumna;
  };
  ordenar: (clave: string, direccion: Direccion) => void;
  alternarValor: (clave: string, valor: string) => void;
  limpiarColumna: (clave: string) => void;
  limpiarTodo: () => void;
  hayFiltros: boolean;
  total: number;
}

function normalizar<T>(columna: ((fila: T) => string) | DefinicionColumna<T>): DefinicionColumna<T> {
  return typeof columna === "function" ? { valor: columna } : columna;
}

function compararValores(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

export function useTablaFiltrable<T>(datos: T[], columnas: Columnas<T>): ControlTabla<T> {
  const [orden, setOrden] = useState<{ clave: string; direccion: Direccion } | null>(null);
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({});

  const definicion = (clave: string) => {
    const columna = columnas[clave];
    return columna ? normalizar(columna) : null;
  };

  // Los valores del filtro se listan con el mismo criterio de orden de la
  // columna: así las fechas quedan cronológicas y los números por magnitud.
  const valoresDisponibles = (clave: string) => {
    const columna = definicion(clave);
    if (!columna) return [];
    const claveOrden = columna.orden ?? columna.valor;
    const vistos = new Map<string, string | number>();
    for (const fila of datos) {
      const texto = columna.valor(fila).trim();
      if (texto && !vistos.has(texto)) vistos.set(texto, claveOrden(fila));
    }
    return [...vistos.entries()]
      .sort(([, ordenA], [, ordenB]) => compararValores(ordenA, ordenB))
      .map(([texto]) => texto);
  };

  // Filtrado: una columna sin selección no filtra nada.
  let filas = datos.filter((fila) =>
    Object.entries(seleccion).every(([clave, valores]) => {
      if (!valores?.length) return true;
      const columna = definicion(clave);
      return columna ? valores.includes(columna.valor(fila).trim()) : true;
    })
  );

  if (orden) {
    const columna = definicion(orden.clave);
    if (columna) {
      const clave = columna.orden ?? columna.valor;
      filas = [...filas].sort((a, b) => {
        const comparacion = compararValores(clave(a), clave(b));
        return orden.direccion === "asc" ? comparacion : -comparacion;
      });
    }
  }

  return {
    filas,
    total: datos.length,
    hayFiltros: orden !== null || Object.values(seleccion).some((valores) => valores.length > 0),
    estadoColumna: (clave) => {
      const seleccionados = seleccion[clave] ?? [];
      const direccion = orden?.clave === clave ? orden.direccion : null;
      return {
        direccion,
        seleccionados,
        disponibles: valoresDisponibles(clave),
        activo: direccion !== null || seleccionados.length > 0,
        tipo: definicion(clave)?.tipo ?? "texto"
      };
    },
    ordenar: (clave, direccion) => setOrden({ clave, direccion }),
    alternarValor: (clave, valor) => {
      setSeleccion((actual) => {
        const disponibles = valoresDisponibles(clave);
        // Sin selección equivale a "todos marcados".
        const actuales = actual[clave]?.length ? actual[clave] : disponibles;
        const nuevos = actuales.includes(valor)
          ? actuales.filter((existente) => existente !== valor)
          : [...actuales, valor];
        // Si vuelven a estar todos, se considera sin filtro.
        return { ...actual, [clave]: nuevos.length === disponibles.length ? [] : nuevos };
      });
    },
    limpiarColumna: (clave) => {
      setSeleccion((actual) => ({ ...actual, [clave]: [] }));
      setOrden((actual) => (actual?.clave === clave ? null : actual));
    },
    limpiarTodo: () => {
      setSeleccion({});
      setOrden(null);
    }
  };
}
