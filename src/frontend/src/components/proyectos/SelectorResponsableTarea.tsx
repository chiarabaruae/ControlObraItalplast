import { UserAvatar } from "@/components/app/UserAvatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { permisos, type Role } from "@/lib/roles";
import { idsAsignablesEnProyecto } from "@/lib/equipos";
import { usuarioConAvatarPorId, usuarios } from "@/mocks/data";

function usuariosAsignables(rol: Role) {
  return usuarios.filter((usuario) => usuario.isActive && permisos.puedeAsignarA(rol, usuario.role));
}

export function SelectorResponsableTarea({
  rol,
  valor,
  onChange,
  id = "responsable-tarea",
  proyectoId
}: {
  rol: Role;
  valor?: string;
  onChange: (responsableId: string | undefined) => void;
  id?: string;
  proyectoId?: string;
}) {
  // Si el proyecto tiene equipos asignados, solo sus integrantes (y recursos
  // adicionales vigentes) pueden recibir la tarea. Sin equipos ⇒ sin restricción.
  const permitidos = proyectoId ? idsAsignablesEnProyecto(proyectoId) : null;
  const disponibles = usuariosAsignables(rol).filter((usuario) => !permitidos || permitidos.has(usuario.id));
  if (!permisos.asignarTarea(rol)) return null;
  const seleccionado = valor ? usuarioConAvatarPorId(valor) : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Responsable de ejecución</Label>
      <Select value={valor ?? "sin-asignar"} onValueChange={(value) => onChange(value === "sin-asignar" ? undefined : value)}>
        <SelectTrigger id={id} className="w-full" aria-label="Responsable de ejecución">
          <SelectValue placeholder="Sin asignar">
            {seleccionado ? (
              <span className="flex items-center gap-2">
                <UserAvatar user={seleccionado} className="size-5" fallbackClassName="text-[9px]" />
                {seleccionado.displayName}
              </span>
            ) : "Sin asignar"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sin-asignar">Sin asignar</SelectItem>
          {disponibles.map((usuario) => {
            const conAvatar = usuarioConAvatarPorId(usuario.id) ?? usuario;
            return (
              <SelectItem key={usuario.id} value={usuario.id}>
                <span className="flex items-center gap-2">
                  <UserAvatar user={conAvatar} className="size-5" fallbackClassName="text-[9px]" />
                  <span>{usuario.displayName}</span>
                  <span className="text-xs text-muted-foreground">· {usuario.role === "viewer" ? "Usuario" : "Supervisor"}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {permitidos
          ? "Limitado a los integrantes de los equipos del proyecto y sus recursos adicionales."
          : rol === "administrator"
            ? "Podés asignar a supervisores o usuarios."
            : "Como supervisor, podés asignar únicamente a usuarios."}
      </p>
    </div>
  );
}
