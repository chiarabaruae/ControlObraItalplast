import type { EvidenciaTarea } from "@/mocks/data";

const MAXIMO_ORIGINAL = 12 * 1024 * 1024;
// Los documentos no se comprimen: límite menor para no agotar localStorage en Fase 2.
const MAXIMO_DOCUMENTO = 4 * 1024 * 1024;
const MAXIMO_LADO = 1280;

/** Tipos de documento admitidos como evidencia además de imágenes (D-031). */
const TIPOS_DOCUMENTO = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain"
];

/** Lista para el atributo `accept` del input de archivo. */
export const ACCEPT_EVIDENCIA = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";

function leerComoDataUrl(archivo: File) {
  return new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error("No se pudo leer la evidencia."));
    lector.readAsDataURL(archivo);
  });
}

function cargarImagen(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => reject(new Error("La imagen seleccionada no es válida."));
    imagen.src = url;
  });
}

async function prepararImagen(archivo: File): Promise<EvidenciaTarea> {
  if (archivo.size > MAXIMO_ORIGINAL) throw new Error("La imagen supera el máximo de 12 MB.");

  const original = await leerComoDataUrl(archivo);
  const imagen = await cargarImagen(original);
  const escala = Math.min(1, MAXIMO_LADO / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagen.width * escala));
  canvas.height = Math.max(1, Math.round(imagen.height * escala));
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar la evidencia.");
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

  return {
    nombre: archivo.name,
    tipo: "image/jpeg",
    tamano: Math.round((dataUrl.length * 3) / 4),
    dataUrl
  };
}

/**
 * Prepara un archivo como evidencia (D-031): las imágenes se comprimen; los
 * documentos (PDF, Word, Excel, CSV, texto) se guardan tal cual con un límite
 * menor. Cualquier otro tipo se rechaza.
 */
export async function prepararEvidencia(archivo: File): Promise<EvidenciaTarea> {
  if (archivo.type.startsWith("image/")) return prepararImagen(archivo);

  const esDocumento = TIPOS_DOCUMENTO.includes(archivo.type) ||
    /\.(pdf|docx?|xlsx?|csv|txt)$/i.test(archivo.name);
  if (!esDocumento) {
    throw new Error("Formato no admitido. Usá imágenes, PDF, Word, Excel, CSV o texto.");
  }
  if (archivo.size > MAXIMO_DOCUMENTO) {
    throw new Error("El documento supera el máximo de 4 MB.");
  }

  const dataUrl = await leerComoDataUrl(archivo);
  return {
    nombre: archivo.name,
    tipo: archivo.type || "application/octet-stream",
    tamano: archivo.size,
    dataUrl
  };
}

/** Evidencia en forma de enlace externo (D-031): guarda la URL, no un archivo. */
export function crearEvidenciaEnlace(url: string): EvidenciaTarea {
  const limpia = url.trim();
  if (!/^https?:\/\/\S+\.\S+/i.test(limpia)) {
    throw new Error("El enlace debe empezar con http:// o https:// y ser una URL válida.");
  }
  return {
    nombre: limpia,
    tipo: "enlace/url",
    tamano: 0,
    dataUrl: limpia,
    esEnlace: true
  };
}
