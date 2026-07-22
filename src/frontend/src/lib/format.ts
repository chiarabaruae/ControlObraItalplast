export function formatFecha(iso: string): string {
  if (!iso) return "-";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function formatFechaCorta(iso: string): string {
  if (!iso) return "-";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit"
  });
}

/** Para timestamps ISO completos (auditoría): fecha corta + hora local. */
export function formatFechaHora(iso: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function saludoDelDia(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function hoyLargo(): string {
  const s = new Date().toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
