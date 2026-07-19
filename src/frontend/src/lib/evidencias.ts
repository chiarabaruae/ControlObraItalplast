import type { EvidenciaTarea } from "@/mocks/data";

const MAXIMO_ORIGINAL = 12 * 1024 * 1024;
const MAXIMO_LADO = 1280;

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

export async function prepararEvidencia(archivo: File): Promise<EvidenciaTarea> {
  if (!archivo.type.startsWith("image/")) throw new Error("La evidencia debe ser una imagen.");
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

