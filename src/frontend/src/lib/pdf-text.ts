import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { agruparTextoPorLineas, type FragmentoTextoPdf } from "@/lib/presupuesto-parser";

GlobalWorkerOptions.workerSrc = workerUrl;

export async function extraerLineasPdf(archivo: File) {
  const datos = new Uint8Array(await archivo.arrayBuffer());
  const tarea = getDocument({ data: datos });
  const documento = await tarea.promise;
  const fragmentos: FragmentoTextoPdf[] = [];

  try {
    for (let pagina = 1; pagina <= documento.numPages; pagina += 1) {
      const hoja = await documento.getPage(pagina);
      const contenido = await hoja.getTextContent();
      for (const item of contenido.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        fragmentos.push({
          texto: item.str,
          x: item.transform[4],
          y: item.transform[5],
          pagina
        });
      }
      hoja.cleanup();
    }
  } finally {
    await tarea.destroy();
  }

  return agruparTextoPorLineas(fragmentos);
}

