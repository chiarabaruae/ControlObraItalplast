import { useState } from "react";
import { Link } from "react-router";
import { Plus, MapPin, Factory, HardHat } from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import { proyectos, clientePorId, usuarioPorId, avanceGeneral, type EstadoObra } from "@/mocks/data";
import { formatFecha } from "@/lib/format";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { EstadoBadge } from "@/components/app/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const FILTROS: { valor: EstadoObra | "todas"; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "en_progreso", label: "En progreso" },
  { valor: "pausada", label: "Pausadas" },
  { valor: "planificada", label: "Planificadas" },
  { valor: "finalizada", label: "Finalizadas" }
];

export default function Proyectos() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState<EstadoObra | "todas">("todas");
  if (!user) return null;

  const visibles = proyectos.filter((p) => filtro === "todas" || p.estado === filtro);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Obras</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Proyectos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={(v) => setFiltro(v as EstadoObra | "todas")}>
            <SelectTrigger className="w-40" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTROS.map((f) => (
                <SelectItem key={f.valor} value={f.valor}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {permisos.crearProyecto(user.role) && (
            <Button className="gap-2" onClick={() => toast("Alta de proyecto", { description: "Se conecta al backend en la Fase 4." })}>
              <Plus className="size-4" /> Nuevo proyecto
            </Button>
          )}
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {visibles.map((p) => {
          const lider = usuarioPorId(p.liderId);
          return (
            <Link key={p.id} to={`/proyectos/${p.id}`} className="group">
              <Card className="h-full gap-4 py-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                <CardContent className="space-y-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-heading text-lg font-bold tracking-tight group-hover:text-primary">
                        {p.nombre}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{p.ubicacion}</span>
                      </div>
                    </div>
                    <EstadoBadge estado={p.estado} className="shrink-0" />
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Factory className="size-3" /> Fábrica</span>
                      </div>
                      <AvanceMeter valor={p.avanceFabrica} etapas={p.etapasFabrica.length} size="sm" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><HardHat className="size-3" /> Obra</span>
                      </div>
                      <AvanceMeter valor={p.avanceObra} etapas={p.etapasObra.length} size="sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="truncate">{clientePorId(p.clienteId)?.nombre}</span>
                    <span className="cifra shrink-0">{avanceGeneral(p)}% · {formatFecha(p.fechaFinEstimada)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Líder: <span className="font-medium text-foreground">{lider?.displayName}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {visibles.length === 0 && (
        <Card className="py-14">
          <CardContent className="text-center text-sm text-muted-foreground">
            No hay proyectos con este estado. Cambiá el filtro para ver el resto.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
