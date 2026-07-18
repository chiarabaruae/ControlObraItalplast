import path from "node:path";

const GLASS_START_TOKENS = ["10MM", "5+5", "6MM", "4MM", "3+3", "4+4", "TEMP", "TEMPL", "LAMINADO", "JUMBO", "INCOLORO"];
const GLASS_STOP_TOKENS = ["RINFORZO", "PROFILO", "ALLARGATORI", "MARCO", "TELAIO", "GUIA", "ANTA", "C. MONT", "C.TRAVERSE", "C TRAVERSE", "BA AL", "SX DX"];

export function parseAbacoPdfText(text, fileName = "") {
  const safeText = String(text || "").replace(/\r/g, "");
  const context = parseFileContext(fileName);
  const segments = safeText
    .split("Pos:")
    .slice(1)
    .map((segment) => `Pos:${segment}`);

  const rows = deduplicateRows(
    segments
      .map((segment) => parseSegment(segment, context))
      .filter((row) => row.numero || row.codPosicion)
  );

  return {
    rows,
    metadata: {
      nombre_cliente: context.nombreCliente,
      numero_abaco: context.numeroAbaco,
      archivo_origen: context.archivoOrigen,
      total_registros: rows.length,
      total_componentes: rows.reduce((sum, row) => sum + (Number(row.cantidad) || 0), 0)
    }
  };
}

function parseSegment(segment, context) {
  const lines = segment
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);

  const telaioLineIndex = lines.findIndex((line) => /Telaio:/i.test(line));
  const telaioLine = telaioLineIndex >= 0 ? lines[telaioLineIndex] : "";
  const codeFromInline = telaioLine.includes("Telaio:")
    ? cleanText(telaioLine.split(/Telaio:/i)[0])
    : "";
  const codeFromPreviousLine = telaioLineIndex > 0 ? cleanText(lines[telaioLineIndex - 1]) : "";
  const rawCode = codeFromInline && !/^Pos:/i.test(codeFromInline) ? codeFromInline : codeFromPreviousLine;
  const codPosicion = rawCode && !/^Pos:/i.test(rawCode)
    ? cleanText(rawCode).split(" ")[0]
    : null;

  const tabTecnica = cleanText(matchGroup(segment, /Tab\.Tecnica:\s*([^\n]+)/i));
  const colorLine = cleanText(matchGroup(segment, /Colore:\s*([^\n]+)/i));
  const color = colorLine
    ? cleanText(colorLine.includes(":") ? colorLine.split(":")[0] : colorLine)
    : null;

  const rawGlassLines = lines
    .filter((line) => isGlassLine(line))
    .map((line) => cleanGlassLine(line))
    .filter(Boolean);
  const preferredGlassLines = rawGlassLines.filter((line) => line.includes(" x ") && line.includes(" - "));
  const tipoVidrio = [...new Set(preferredGlassLines.length ? preferredGlassLines : rawGlassLines)].join(" | ") || null;

  const numero = parseNumber(matchGroup(segment, /Pos:\s*(\d+)/i));
  const cantidad = parseNumber(matchGroup(segment, /Qta:\s*([0-9.,]+)/i)) || 1;
  const anchoMm = parseNumber(matchGroup(segment, /Telaio:\s*L\s*=\s*([0-9.,]+)/i));
  const largoMm = parseNumber(matchGroup(segment, /Telaio:\s*L\s*=\s*[0-9.,]+\s*H\s*=\s*([0-9.,]+)/i));
  const ambiente = extractAmbiente(segment);
  const serie = isUndefinedTab(tabTecnica) || isAluminumContext(`${tabTecnica} ${segment} ${context.archivoOrigen}`)
    ? "Aluminio"
    : "PVC";

  return {
    numero: numero || null,
    codPosicion: codPosicion || (numero ? String(numero) : null),
    ambiente,
    cantidad: cantidad || 1,
    anchoMm,
    largoMm,
    serie,
    color,
    tipoVidrio,
    observaciones: null
  };
}

function deduplicateRows(rows) {
  const seen = new Map();

  for (const row of rows) {
    const key = String(row.numero || row.codPosicion || `${row.ambiente || ""}-${row.anchoMm || ""}-${row.largoMm || ""}`);
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }

  return [...seen.values()].sort((left, right) => {
    const leftNumber = Number(left.numero || 0);
    const rightNumber = Number(right.numero || 0);
    if (leftNumber !== rightNumber) return leftNumber - rightNumber;
    return String(left.codPosicion || "").localeCompare(String(right.codPosicion || ""));
  });
}

function parseFileContext(fileName) {
  const archivoOrigen = path.basename(fileName || "");
  const baseName = path.basename(archivoOrigen, path.extname(archivoOrigen));
  const parts = baseName.split("-").map((part) => cleanText(part)).filter(Boolean);
  const clientCandidate = parts.length ? cleanText(parts[0].replace(/^(?:ÁBACO|ABACO)\s+/i, "")) : "";
  const numberSource = parts.slice(1).join("-") || baseName;
  const numberMatch = numberSource.match(/\d+/g);

  return {
    archivoOrigen,
    nombreCliente: clientCandidate || null,
    numeroAbaco: numberMatch?.length ? Number(numberMatch.join("")) : null
  };
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUpper(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function parseNumber(value) {
  const text = cleanText(value);
  if (!text) return null;

  const normalized = text.includes(",") && !text.includes(".")
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/,/g, "");
  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

function matchGroup(text, regex) {
  const match = String(text || "").match(regex);
  return match?.[1] ?? "";
}

function isUndefinedTab(value) {
  const compact = normalizeUpper(value).replace(/[ \-–—]/g, "");
  return !compact || compact === "N/A" || compact === "NA" || compact === "S/D";
}

function isAluminumContext(value) {
  const padded = ` ${normalizeUpper(value)} `
    .replace(/[-_/.]/g, " ")
    .replace(/\s+/g, " ");

  return padded.includes(" ALUMINIO ")
    || padded.includes(" ALU ")
    || padded.includes(" ALUMINIUM ");
}

function isGlassLine(value) {
  const upper = normalizeUpper(value);
  return /(INCOLORO|LAMINADO|TEMP|TEMPL|JUMBO|\d\+\d|MM\b)/.test(upper);
}

function cleanGlassLine(value) {
  let text = cleanText(value);
  if (!text) return null;

  const upper = normalizeUpper(text);
  const startIndexes = GLASS_START_TOKENS
    .map((token) => upper.indexOf(token))
    .filter((index) => index >= 0);

  if (startIndexes.length) {
    text = cleanText(text.slice(Math.min(...startIndexes)));
  }

  const upperTrimmed = normalizeUpper(text);
  const stopIndexes = GLASS_STOP_TOKENS
    .map((token) => upperTrimmed.indexOf(token))
    .filter((index) => index > 0);

  if (stopIndexes.length) {
    text = cleanText(text.slice(0, Math.min(...stopIndexes)));
  }

  text = text
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*[xX]\s*/g, " x ")
    .replace(/\s+/g, " ")
    .trim();

  return text || null;
}

function extractAmbiente(segment) {
  const tail = segment.includes("SX DX") ? segment.split("SX DX").pop() : "";
  const candidates = String(tail || "")
    .split("\n")
    .map((line) => extractOnlyAmbiente(line))
    .filter(Boolean);

  return candidates[0] || null;
}

function extractOnlyAmbiente(value) {
  const parts = cleanText(value).split(" ").filter(Boolean);
  if (!parts.length) return null;

  const startIndex = parts.findIndex((part) => part.replace(/[0-9.,\-\/xX()[\]]/g, "").length > 0);
  if (startIndex === -1) return null;

  return cleanText(parts.slice(startIndex).join(" "));
}
