import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, Bell, Clock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth";
import { construirNotificaciones, idsVistos, marcarVistos, type NivelNotif } from "@/lib/notificaciones";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const NIVEL_META: Record<NivelNotif, { icono: typeof Clock; cls: string }> = {
  personal: { icono: Clock, cls: "text-primary" },
  supervision: { icono: AlertCircle, cls: "text-estado-pausada" },
  gobernanza: { icono: ShieldCheck, cls: "text-estado-progreso" }
};

export function CampanaNotificaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [vistos, setVistos] = useState<Set<string>>(() => (user ? idsVistos(user.id) : new Set()));

  // Se recalcula al abrir para reflejar el estado vivo de los datos.
  const notifs = useMemo(() => (user ? construirNotificaciones(user) : []), [user, abierto]);

  if (!user) return null;

  const noLeidas = notifs.filter((n) => !vistos.has(n.id)).length;

  const alAbrir = (open: boolean) => {
    setAbierto(open);
    if (open && notifs.length > 0) {
      marcarVistos(user.id, notifs.map((n) => n.id));
      setVistos(idsVistos(user.id));
    }
  };

  return (
    <DropdownMenu open={abierto} onOpenChange={alAbrir}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative grid size-9 place-items-center rounded-full transition-colors hover:bg-muted"
          aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ""}`}
        >
          <Bell className="size-5" strokeWidth={1.75} />
          {noLeidas > 0 && (
            <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-estado-riesgo px-1 text-[10px] font-bold leading-4 text-white">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          <span className="text-xs font-normal text-muted-foreground">{notifs.length}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifs.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Sin novedades por ahora.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifs.map((n) => {
              const meta = NIVEL_META[n.nivel];
              const Icono = meta.icono;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (n.enlace) navigate(n.enlace);
                    setAbierto(false);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <span className={cn("mt-0.5 shrink-0", meta.cls)}>
                    <Icono className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{n.titulo}</span>
                    {n.detalle && <span className="block truncate text-xs text-muted-foreground">{n.detalle}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
