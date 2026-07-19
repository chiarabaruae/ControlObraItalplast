// Regla de avance — elemento firma de la interfaz.
// Un medidor con muescas por etapa, como regla de taller: la posición de
// cada muesca marca el fin de una etapa del proceso (fábrica o instalación).
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AvanceMeterProps {
  valor: number; // 0-100
  etapas?: number; // cantidad de muescas internas (etapas del proceso)
  size?: "sm" | "md" | "lg";
  className?: string;
  mostrarCifra?: boolean;
}

const alturas = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

export function AvanceMeter({ valor, etapas = 0, size = "md", className, mostrarCifra = true, }: AvanceMeterProps) {
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setFill(valor));
    return () => cancelAnimationFrame(t);
  }, [valor]);

  const muescas = etapas > 1 ? Array.from({ length: etapas - 1 }, (_, i) => ((i + 1) / etapas) * 100) : [];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("relative flex-1 overflow-hidden rounded-full bg-muted", alturas[size])}
      >
        <div
          className="avance-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70"
          style={{ width: `${fill}%` }}
        />
        {muescas.map((pos) => (
          <span
            key={pos}
            aria-hidden
            className="absolute inset-y-0 w-px bg-background/80"
            style={{ left: `${pos}%` }}
          />
        ))}
      </div>
      {mostrarCifra && (
        <span className={cn("cifra shrink-0 tabular-nums text-muted-foreground", size === "lg" ? "text-sm font-semibold text-foreground" : "text-xs")}>
          {valor}%
        </span>
      )}
    </div>
  );
}
