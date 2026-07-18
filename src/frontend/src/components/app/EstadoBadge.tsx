import { cn } from "@/lib/utils";
import type { EstadoObra } from "@/mocks/data";

const ESTADOS: Record<EstadoObra, { label: string; cls: string }> = {
  planificada: { label: "Planificada", cls: "bg-muted text-muted-foreground border-transparent" },
  en_progreso: { label: "En progreso", cls: "bg-estado-progreso/12 text-estado-progreso border-estado-progreso/25" },
  pausada: { label: "Pausada", cls: "bg-estado-pausada/12 text-estado-pausada border-estado-pausada/25" },
  finalizada: { label: "Finalizada", cls: "bg-primary/10 text-primary border-primary/25" },
  cancelada: { label: "Cancelada", cls: "bg-estado-riesgo/12 text-estado-riesgo border-estado-riesgo/25" }
};

export function EstadoBadge({ estado, className }: { estado: EstadoObra; className?: string }) {
  const e = ESTADOS[estado];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", e.cls, className)}>
      {e.label}
    </span>
  );
}

const PRIORIDADES: Record<string, string> = {
  baja: "bg-muted text-muted-foreground",
  media: "bg-primary/10 text-primary",
  alta: "bg-estado-pausada/12 text-estado-pausada",
  urgente: "bg-estado-riesgo/12 text-estado-riesgo"
};

export function PrioridadBadge({ prioridad }: { prioridad: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", PRIORIDADES[prioridad])}>
      {prioridad}
    </span>
  );
}
