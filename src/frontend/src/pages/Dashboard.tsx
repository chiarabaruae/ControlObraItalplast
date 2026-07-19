import { Link } from "react-router";
import { Building2, Factory, HardHat, AlertTriangle, ListTodo, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/auth";
import { saludoDelDia, hoyLargo, formatFecha } from "@/lib/format";
import { proyectos, tareasIniciales, usuarioPorId, clientePorId, avanceGeneral } from "@/mocks/data";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { EstadoBadge } from "@/components/app/EstadoBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const activos = proyectos.filter((p) => p.estado !== "finalizada" && p.estado !== "cancelada");
  const enProgreso = proyectos.filter((p) => p.estado === "en_progreso");
  const pausadas = proyectos.filter((p) => p.estado === "pausada");
  const tareasAbiertas = tareasIniciales.filter((t) => t.estado !== "finalizada");
  const misTareas = tareasAbiertas.filter((t) => t.responsableId === user.id);

  const kpis = [
    { icono: Building2, valor: activos.length, label: "Proyectos activos" },
    { icono: Factory, valor: `${Math.round(activos.reduce((a, p) => a + p.avanceFabrica, 0) / Math.max(activos.length, 1))}%`, label: "Avance fábrica" },
    { icono: HardHat, valor: `${Math.round(activos.reduce((a, p) => a + p.avanceObra, 0) / Math.max(activos.length, 1))}%`, label: "Avance obra" },
    { icono: AlertTriangle, valor: pausadas.length, label: "Obras pausadas", alerta: pausadas.length > 0 }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <div className="senal">Inicio</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {saludoDelDia()}, {user.displayName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{hoyLargo()}</p>
      </header>

      {/* KPIs */}
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="gap-3 py-5">
            <CardContent className="flex items-center gap-3.5 px-5">
              <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${k.alerta ? "bg-estado-pausada/12 text-estado-pausada" : "bg-accent text-accent-foreground"}`}>
                <k.icono className="size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="cifra text-2xl leading-none font-bold">{k.valor}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Obras en curso: la regla de avance como protagonista */}
      <section>
        <Card>
          <CardHeader className="flex-row items-baseline justify-between">
            <CardTitle className="font-heading text-base">Obras en curso</CardTitle>
            <Link to="/proyectos" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ver todas <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-6">
            {[...enProgreso, ...pausadas].map((p) => (
              <Link key={p.id} to={`/proyectos/${p.id}`} className="group block">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium group-hover:text-primary">{p.nombre}</span>
                  <EstadoBadge estado={p.estado} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {clientePorId(p.clienteId)?.nombre} · entrega {formatFecha(p.fechaFinEstimada)}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-6">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Factory className="size-3" /> Fábrica
                    </div>
                    <AvanceMeter valor={p.avanceFabrica} etapas={p.etapasFabrica.length} size="md" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <HardHat className="size-3" /> Obra
                    </div>
                    <AvanceMeter valor={p.avanceObra} etapas={p.etapasObra.length} size="md" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Tareas */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-baseline justify-between">
            <CardTitle className="font-heading text-base">
              {misTareas.length > 0 ? "Tus tareas" : "Tareas del equipo"}
            </CardTitle>
            <Link to="/tareas" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Tareas <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(misTareas.length > 0 ? misTareas : tareasAbiertas.slice(0, 4)).map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <ListTodo className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                  <span className="cifra shrink-0 text-xs text-muted-foreground">{formatFecha(t.fechaFin)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Resumen general</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {proyectos.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{p.nombre}</span>
                  <span className="text-muted-foreground">{usuarioPorId(p.liderId)?.displayName}</span>
                </div>
                <AvanceMeter valor={avanceGeneral(p)} size="sm" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
