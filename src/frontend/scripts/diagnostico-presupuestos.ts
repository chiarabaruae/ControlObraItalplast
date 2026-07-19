import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  agruparTextoPorLineas,
  parsearPresupuesto,
  type FragmentoTextoPdf
} from "../src/lib/presupuesto-parser";

const CANTIDADES_ESPERADAS = {
  tabla_excel: 4,
  preference: 34,
  preference_mercosul: 9
} as const;

async function extraerLineas(ruta: string) {
  const datos = new Uint8Array(await readFile(ruta));
  const tarea = getDocument({ data: datos });
  const documento = await tarea.promise;
  const fragmentos: FragmentoTextoPdf[] = [];

  try {
    for (let pagina = 1; pagina <= documento.numPages; pagina += 1) {
      const hoja = await documento.getPage(pagina);
      const contenido = await hoja.getTextContent();
      for (const item of contenido.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        fragmentos.push({ texto: item.str, x: item.transform[4], y: item.transform[5], pagina });
      }
      hoja.cleanup();
    }
  } finally {
    await tarea.destroy();
  }

  return agruparTextoPorLineas(fragmentos);
}

const rutas = process.argv.slice(2);
if (rutas.length === 0) {
  throw new Error("Indicá uno o más presupuestos PDF después de -- para ejecutar el diagnóstico.");
}

for (const ruta of rutas) {
  const lineas = await extraerLineas(ruta);
  const archivo = { name: path.basename(ruta), size: (await readFile(ruta)).byteLength };
  const presupuesto = parsearPresupuesto(lineas, archivo);

  assert.notEqual(presupuesto.formato, "desconocido", `${archivo.name}: formato desconocido`);
  const esperada = CANTIDADES_ESPERADAS[presupuesto.formato];
  assert.equal(presupuesto.items.length, esperada, `${archivo.name}: cantidad de componentes inesperada`);
  assert.ok(presupuesto.items.every((item) => item.codigo && item.cantidad > 0), `${archivo.name}: hay filas incompletas`);
  assert.ok(presupuesto.items.every((item) => item.ancho > 0 && item.alto > 0), `${archivo.name}: hay medidas inválidas`);

  const unidades = presupuesto.items.reduce((total, item) => total + item.cantidad, 0);
  console.log(`✓ ${archivo.name}: ${presupuesto.formato}, ${presupuesto.items.length} componentes, ${unidades} unidades`);
}

console.log(`✓ Diagnóstico completado: ${rutas.length} PDF procesado${rutas.length === 1 ? "" : "s"} sin OCR.`);

