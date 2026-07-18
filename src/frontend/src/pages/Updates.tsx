import { CheckCircle2, Clock3, RefreshCw, Rocket } from "lucide-react";
import { APP_NAME, APP_RELEASE, APP_RELEASE_DATE, APP_VERSION } from "@/lib/app-info";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Updates() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Settings</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultá la versión instalada y actualizá la aplicación cuando sea necesario.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Rocket className="size-5" />
            </div>
            <div>
              <CardTitle>{APP_NAME}</CardTitle>
              <CardDescription>Gestión de proyectos Italplast</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/45 p-4">
              <div className="text-xs text-muted-foreground">Versión</div>
              <div className="cifra mt-1 text-lg font-semibold">v{APP_VERSION}</div>
            </div>
            <div className="rounded-xl bg-muted/45 p-4">
              <div className="text-xs text-muted-foreground">Canal</div>
              <div className="mt-1 text-sm font-semibold">{APP_RELEASE}</div>
            </div>
            <div className="rounded-xl bg-muted/45 p-4">
              <div className="text-xs text-muted-foreground">Publicación</div>
              <div className="mt-1 text-sm font-semibold">{APP_RELEASE_DATE}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
            <CheckCircle2 className="size-5 shrink-0 text-estado-progreso" />
            <div className="flex-1">
              <div className="text-sm font-semibold">La aplicación está lista para comprobar actualizaciones</div>
              <p className="text-xs text-muted-foreground">La comprobación recarga la página y obtiene la última versión disponible.</p>
            </div>
            <Button className="gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" /> Check for updates
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" /> Las actualizaciones automáticas se habilitarán al publicar la aplicación.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
