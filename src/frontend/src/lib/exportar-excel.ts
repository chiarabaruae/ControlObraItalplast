// Export a Excel dependency-free (D-037): genera un archivo SpreadsheetML 2003
// (.xls) que Excel abre como planilla real, sin librerías externas. Cada descarga
// se registra localmente como traza de auditoría (placeholder del backend/BD).

export interface ColumnaExport<T> {
  header: string;
  valor: (fila: T) => string | number | null | undefined;
}

function escXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function celda(valor: string | number | null | undefined): string {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<Cell><Data ss:Type="Number">${valor}</Data></Cell>`;
  }
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return `<Cell><Data ss:Type="String">${escXml(texto)}</Data></Cell>`;
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Descarga las filas como un archivo .xls (una hoja) respetando el orden de columnas dado. */
export function exportarExcel<T>(
  nombreArchivo: string,
  nombreHoja: string,
  columnas: ColumnaExport<T>[],
  filas: T[]
) {
  const encabezado = `<Row>${columnas.map((c) => `<Cell><Data ss:Type="String">${escXml(c.header)}</Data></Cell>`).join("")}</Row>`;
  const cuerpo = filas.map((fila) => `<Row>${columnas.map((c) => celda(c.valor(fila))).join("")}</Row>`).join("");
  const hoja = escXml(nombreHoja).slice(0, 31) || "Hoja1";
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Worksheet ss:Name="${hoja}"><Table>${encabezado}${cuerpo}</Table></Worksheet></Workbook>`;
  descargarBlob(new Blob([xml], { type: "application/vnd.ms-excel" }), `${nombreArchivo}.xls`);
}

export interface RegistroDescarga {
  fecha: string;
  usuarioId: string;
  vista: string;
  filtros: string;
  filas: number;
}

const AUDITORIA_KEY = "control-obras-auditoria-descargas";

/**
 * Traza local de descargas (placeholder). No se muestra en el front; queda para
 * auditorías. En producción esto va a la BD vía backend.
 */
export function registrarDescarga(registro: RegistroDescarga) {
  if (typeof window === "undefined") return;
  try {
    const previo = JSON.parse(window.localStorage.getItem(AUDITORIA_KEY) ?? "[]");
    const lista = Array.isArray(previo) ? previo : [];
    lista.push(registro);
    // Se conservan las últimas 500 para no inflar el almacenamiento.
    window.localStorage.setItem(AUDITORIA_KEY, JSON.stringify(lista.slice(-500)));
  } catch {
    // la auditoría no debe romper la descarga
  }
}
