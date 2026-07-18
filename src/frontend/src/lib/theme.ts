export type Tema = "claro" | "oscuro" | "sistema";

export const ACENTOS = [
  { nombre: "Azul Italplast", valor: "#0060af", oscuro: "#4aa3df" },
  { nombre: "Violeta proyecto", valor: "oklch(0.47 0.216 322)", oscuro: "oklch(0.66 0.19 322)" },
  { nombre: "Verde obra", valor: "oklch(0.47 0.14 155)", oscuro: "oklch(0.66 0.13 155)" },
  { nombre: "Naranja señal", valor: "oklch(0.55 0.16 55)", oscuro: "oklch(0.7 0.15 55)" }
];

export function aplicarTema(tema: Tema) {
  const oscuro =
    tema === "oscuro" ||
    (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

export function aplicarAcento(index: number) {
  const acento = ACENTOS[index] ?? ACENTOS[0];
  const root = document.documentElement;
  if (index === 0) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar-primary");
    return;
  }
  const value = root.classList.contains("dark") ? acento.oscuro : acento.valor;
  root.style.setProperty("--primary", value);
  root.style.setProperty("--ring", value);
  root.style.setProperty("--sidebar-primary", value);
}
