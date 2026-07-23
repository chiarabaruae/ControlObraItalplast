// Regla transversal (D-031): toda justificación escrita (motivos de reapertura,
// pausa, cancelación, reactivación, observaciones de evidencia, etc.) exige un
// mínimo de caracteres para que "..." o "ok" no cuenten como justificación.
export const MINIMO_JUSTIFICACION = 50;

export function justificacionValida(texto: string) {
  return texto.trim().length >= MINIMO_JUSTIFICACION;
}

export function caracteresFaltantes(texto: string) {
  return Math.max(0, MINIMO_JUSTIFICACION - texto.trim().length);
}

export function descripcionJustificacion(texto: string) {
  const faltan = caracteresFaltantes(texto);
  return faltan > 0
    ? `Escribí al menos ${MINIMO_JUSTIFICACION} caracteres (faltan ${faltan}).`
    : "Justificación suficiente.";
}
