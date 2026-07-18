import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, RotateCcw } from "lucide-react";
import { aplicarTema } from "@/components/app/AppShell";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tema = "claro" | "oscuro" | "sistema";

// Acentos alternativos en OKLCH — mismo croma/luz que el violeta de marca
const ACENTOS = [
  { nombre: "Violeta Italplast", valor: "oklch(0.47 0.216 322)", oscuro: "oklch(0.66 0.19 322)" },
  { nombre: "Azul plano", valor: "oklch(0.47 0.19 262)", oscuro: "oklch(0.66 0.17 262)" },
  { nombre: "Verde obra", valor: "oklch(0.47 0.14 155)", oscuro: "oklch(0.66 0.13 155)" },
  { nombre: "Naranja señal", valor: "oklch(0.55 0.16 55)", oscuro: "oklch(0.7 0.15 55)" }
];

function aplicarAcento(idx: number) {
  const acento = ACENTOS[idx];
  const raiz = document.documentElement;
  if (idx === 0) {
    raiz.style.removeProperty("--primary");
    raiz.style.removeProperty("--ring");
    raiz.style.removeProperty("--sidebar-primary");
    return;
  }
  const oscuro = raiz.classList.contains("dark");
  const valor = oscuro ? acento.oscuro : acento.valor;
  raiz.style.setProperty("--primary", valor);
  raiz.style.setProperty("--ring", valor);
  raiz.style.setProperty("--sidebar-primary", valor);
}

export default function Personalizar() {
  const [tema, setTema] = useState<Tema>(() => (localStorage.getItem("co-tema") as Tema) ?? "sistema");
  const [acento, setAcento] = useState<number>(() => Number(localStorage.getItem("co-acento") ?? 0));

  useEffect(() => {
    aplicarTema(tema);
    localStorage.setItem("co-tema", tema);
    aplicarAcento(acento); // re-aplicar al cambiar tema (variante clara/oscura)
  }, [tema, acento]);

  useEffect(() => {
    localStorage.setItem("co-acento", String(acento));
  }, [acento]);

  const TEMAS: { valor: Tema; label: string; icono: typeof Sun }[] = [
    { valor: "claro", label: "Claro", icono: Sun },
    { valor: "oscuro", label: "Oscuro", icono: Moon },
    { valor: "sistema", label: "Sistema", icono: Monitor }
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Preferencias</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Personalizar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preferencias locales de este equipo. No cambian datos de obra.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Tema</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {TEMAS.map((t) => (
            <button
              key={t.valor}
              onClick={() => setTema(t.valor)}
              aria-pressed={tema === t.valor}
              className={`flex flex-1 flex-col items-center gap-2 rounded-lg border py-4 text-sm font-medium transition-colors ${
                tema === t.valor ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted/60"
              }`}
            >
              <t.icono className="size-5" strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-base">Color de acento</CardTitle>
          {acento !== 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setAcento(0)}>
              <RotateCcw className="size-3.5" /> Restaurar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {ACENTOS.map((a, i) => (
              <button
                key={a.nombre}
                onClick={() => setAcento(i)}
                aria-pressed={acento === i}
                aria-label={a.nombre}
                title={a.nombre}
                className={`size-10 rounded-full border-2 transition-transform hover:scale-105 ${
                  acento === i ? "border-foreground" : "border-transparent"
                }`}
                style={{ background: a.valor }}
              />
            ))}
          </div>
          <div>
            <div className="senal senal-muted mb-2">Vista previa</div>
            <AvanceMeter valor={64} etapas={6} size="lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
