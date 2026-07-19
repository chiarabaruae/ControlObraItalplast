import type { ItemPresupuesto, PresupuestoEjecutivo, TipoProducto } from "@/mocks/data";

export interface FragmentoTextoPdf {
  texto: string;
  x: number;
  y: number;
  pagina: number;
}

interface FilaTextoPdf {
  y: number;
  pagina: number;
  fragmentos: FragmentoTextoPdf[];
}

const limpiar = (valor: string) => valor.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

export function agruparTextoPorLineas(fragmentos: FragmentoTextoPdf[], tolerancia = 2): string[] {
  const filas: FilaTextoPdf[] = [];

  for (const fragmento of fragmentos) {
    if (!limpiar(fragmento.texto)) continue;
    const fila = filas.find(
      (candidata) => candidata.pagina === fragmento.pagina && Math.abs(candidata.y - fragmento.y) <= tolerancia
    );
    if (fila) fila.fragmentos.push(fragmento);
    else filas.push({ pagina: fragmento.pagina, y: fragmento.y, fragmentos: [fragmento] });
  }

  return filas
    .sort((a, b) => a.pagina - b.pagina || b.y - a.y)
    .map((fila) =>
      limpiar(
        fila.fragmentos
          .sort((a, b) => a.x - b.x)
          .map((fragmento) => fragmento.texto)
          .join(" ")
      )
    )
    .filter(Boolean);
}

function numeroMedida(valor: string) {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return 0;
  return numero > 0 && numero <= 10 ? Math.round(numero * 1000) : Math.round(numero);
}

function numeroEntero(valor: string) {
  const numero = Number(valor.replace(/\D/g, ""));
  return Number.isFinite(numero) ? numero : 0;
}

function valorDespuesDeDosPuntos(linea: string) {
  return limpiar(linea.slice(linea.indexOf(":") + 1));
}

function campoEnSegmento(segmento: string[], patron: RegExp) {
  const linea = segmento.find((actual) => patron.test(actual));
  return linea ? valorDespuesDeDosPuntos(linea) : "";
}

function sugerirProductoPreference(serie: string, ambiente: string): TipoProducto {
  const texto = `${serie} ${ambiente}`.toLocaleUpperCase();
  if (/PVC|IDEAL|KÖMMERLING|KOMMERLING/.test(texto)) return "aberturas_pvc";
  return "aberturas_aluminio";
}

function parsearTablaExcel(lineas: string[]): ItemPresupuesto[] {
  const items: ItemPresupuesto[] = [];
  const patron = /^(\d+)\s+(POS\s+\S+)\s+(.+?)\s+(\S+)\s+(\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)/i;

  for (const linea of lineas) {
    const coincidencia = linea.match(patron);
    if (!coincidencia) continue;
    const [, posicion, referencia, tipologia, ubicacion, cantidad, ancho, alto] = coincidencia;
    items.push({
      id: `item-${posicion}-${referencia.replace(/\s/g, "-")}`,
      posicion,
      codigo: referencia,
      ambiente: ubicacion,
      cantidad: numeroEntero(cantidad),
      ancho: numeroMedida(ancho),
      alto: numeroMedida(alto),
      descripcion: tipologia,
      serie: "",
      color: "",
      vidrio: "",
      tipoProducto: "aberturas_aluminio"
    });
  }
  return items;
}

function parsearPreference(lineas: string[]): ItemPresupuesto[] {
  const items: ItemPresupuesto[] = [];
  const patronCabecera = /^Pos\.(\d+)\s+(\S+)\s+(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)\s+(\d+)\s+Pz\b/i;
  const indices = lineas.flatMap((linea, indice) => (patronCabecera.test(linea) ? [indice] : []));

  indices.forEach((indice, posicionIndice) => {
    const cabecera = lineas[indice].match(patronCabecera);
    if (!cabecera) return;
    const segmento = lineas.slice(indice + 1, indices[posicionIndice + 1] ?? lineas.length);
    const [, posicion, codigo, ancho, alto, cantidad] = cabecera;
    const serie = campoEnSegmento(segmento, /^Serie\s*:/i);
    const color = campoEnSegmento(segmento, /^(?:\d+\s+)?Color\s*:/i);
    const vidrio = campoEnSegmento(segmento, /^Vidrios\s*\/\s*Paneles\s*:/i);
    const ambienteBruto = segmento.find((linea) => {
      const normalizada = linea.replace(/^\d+(?:[.,]\d+)?\s+/, "");
      return /^[A-ZÑ0-9/.-]+\s*-\s*\S+/i.test(normalizada) && !/^(Oferta|Traslado)/i.test(normalizada);
    }) ?? "";
    const ambiente = limpiar(ambienteBruto.replace(/^\d+(?:[.,]\d+)?\s+/, ""));

    items.push({
      id: `item-${posicion}-${codigo}`,
      posicion,
      codigo,
      ambiente,
      cantidad: numeroEntero(cantidad),
      ancho: numeroMedida(ancho),
      alto: numeroMedida(alto),
      descripcion: ambiente || `Posición ${posicion}`,
      serie,
      color,
      vidrio,
      tipoProducto: sugerirProductoPreference(serie, ambiente)
    });
  });
  return items;
}

function parsearPreferenceMercosul(lineas: string[]): ItemPresupuesto[] {
  const items: ItemPresupuesto[] = [];
  const patronCabecera = /^(\d+)\s+(\S+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+X\s+(\d+(?:[.,]\d+)?)\s+(\d+)\s+PYG\b/i;
  const indices = lineas.flatMap((linea, indice) => (patronCabecera.test(linea) ? [indice] : []));

  indices.forEach((indice, posicionIndice) => {
    const cabecera = lineas[indice].match(patronCabecera);
    if (!cabecera) return;
    const segmento = lineas.slice(indice + 1, indices[posicionIndice + 1] ?? lineas.length);
    const [, posicion, tipo, codigo, ancho, alto, cantidad] = cabecera;
    const descripcionInicial = campoEnSegmento(segmento, /^Descripci[oó]n\s*:/i);
    const continuacionDescripcion = segmento.find((linea) => /^(PAÑOS?|PANOS?)$/i.test(linea)) ?? "";
    const descripcion = limpiar(`${descripcionInicial} ${continuacionDescripcion}`);
    const color = campoEnSegmento(segmento, /^Color\s*:/i);
    const detalles = campoEnSegmento(segmento, /^Detalles\s*:/i).replace(/\s+PYG\s+.+$/i, "");

    items.push({
      id: `item-${posicion}-${tipo}`,
      posicion,
      codigo: limpiar(codigo),
      ambiente: tipo,
      cantidad: numeroEntero(cantidad),
      ancho: numeroMedida(ancho),
      alto: numeroMedida(alto),
      descripcion: limpiar(descripcion || codigo),
      serie: "",
      color,
      vidrio: detalles,
      tipoProducto: /CAJA|MOTOR|PERSIANA/i.test(`${codigo} ${descripcion}`) ? "persianas" : "aberturas_aluminio"
    });
  });
  return items;
}

function detectarFormato(lineas: string[]): PresupuestoEjecutivo["formato"] {
  const texto = lineas.join("\n");
  if (/PREFERENCE MERCOSUL|Propuesta Comercial/i.test(texto)) return "preference_mercosul";
  if (/DETALLE Y PLANILLA DE ABERTURAS|^Pos\.\d+/im.test(texto)) return "preference";
  if (/POS\.\s+REF\.\s+TIPOLOGIA/i.test(texto)) return "tabla_excel";
  return "desconocido";
}

function detectarNumero(lineas: string[], formato: PresupuestoEjecutivo["formato"]) {
  const texto = lineas.slice(0, 35).join(" ");
  const patron = formato === "preference_mercosul"
    ? /N[º°]\s*([\d/-]+)/i
    : formato === "preference"
      ? /Oferta\s+([\d/-]+)/i
      : /N[º°]\s*([\d/-]+)/i;
  return texto.match(patron)?.[1] ?? "";
}

function detectarFecha(lineas: string[]) {
  const texto = lineas.slice(0, 35).join(" ");
  return texto.match(/(?:Fecha Creaci[oó]n:\s*)?(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/)?.[1] ?? "";
}

export function parsearPresupuesto(
  lineasOriginales: string[],
  archivo: Pick<File, "name" | "size"> | { name: string; size: number }
): PresupuestoEjecutivo {
  const lineas = lineasOriginales.map(limpiar).filter(Boolean);
  const formato = detectarFormato(lineas);
  const items = formato === "preference_mercosul"
    ? parsearPreferenceMercosul(lineas)
    : formato === "preference"
      ? parsearPreference(lineas)
      : formato === "tabla_excel"
        ? parsearTablaExcel(lineas)
        : [];

  return {
    nombreArchivo: archivo.name,
    tamano: archivo.size,
    formato,
    numero: detectarNumero(lineas, formato),
    fecha: detectarFecha(lineas),
    importadoEn: new Date().toISOString(),
    items
  };
}
