import { UsersRound, Hammer, ClipboardList, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const IDEAS = [
  { icono: UsersRound, titulo: "Armar equipos", texto: "Agrupar personas en cuadrillas o equipos con un nombre propio." },
  { icono: UserPlus, titulo: "Asignar responsables", texto: "Nombrar un encargado por equipo y sumar o quitar integrantes." },
  { icono: ClipboardList, titulo: "Asignar proyectos", texto: "Vincular cada equipo a los proyectos u obras que tiene a cargo." }
];

export default function Equipos() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Administración</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Equipos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Espacio para que supervisión y administración organicen los equipos de trabajo. Sección en construcción.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Hammer className="size-7" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-lg font-semibold">Próximamente</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Estamos esbozando cómo organizar los equipos. La idea es que puedas crear equipos, asignarles responsables
            y vincularlos a los proyectos que gestionan.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {IDEAS.map((idea) => (
          <Card key={idea.titulo}>
            <CardContent className="space-y-2 p-4">
              <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <idea.icono className="size-4.5" strokeWidth={1.75} />
              </div>
              <div className="font-heading text-sm font-semibold">{idea.titulo}</div>
              <p className="text-xs text-muted-foreground">{idea.texto}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
