import { BookOpen, ChevronRight, CircleHelp, FileText, ListChecks, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const GUIDES = [
  { title: "Primeros pasos", description: "Ingreso, navegación y configuración de la cuenta.", icon: CircleHelp },
  { title: "Gestión de proyectos", description: "Creación, cronogramas, documentos y seguimiento.", icon: FileText },
  { title: "Tareas y responsables", description: "Asignación, prioridades y cierre de actividades.", icon: ListChecks },
  { title: "Roles y permisos", description: "Qué puede consultar y modificar cada perfil.", icon: ShieldCheck }
];

export default function Documentation() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="senal">Support</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guías breves para resolver dudas y aprovechar las herramientas del sistema.
        </p>
      </header>

      <Card className="relative overflow-hidden bg-[#0060af] text-white">
        <CardContent className="relative z-10 flex min-h-44 items-center gap-6 py-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-white/10">
            <BookOpen className="size-10 text-white/90" strokeWidth={1.4} />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">Centro de ayuda</div>
            <h2 className="mt-2 max-w-lg text-2xl font-bold">Encontrá respuestas para cada etapa del proyecto.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
              Esta biblioteca crecerá junto con nuevas funciones y líneas de producto.
            </p>
          </div>
        </CardContent>
        <div aria-hidden className="absolute -right-12 -bottom-20 size-64 rounded-full border-[36px] border-white/5" />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <Card key={guide.title} size="sm" className="transition-colors hover:bg-muted/20">
            <CardHeader className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <guide.icon className="size-5" />
              </div>
              <div>
                <CardTitle>{guide.title}</CardTitle>
                <CardDescription>{guide.description}</CardDescription>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
