import { useRef, type ChangeEvent } from "react";
import { Camera, Check, IdCard, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const AVATARS = [
  { value: "emoji:👷", label: "Obra" },
  { value: "emoji:🧑‍💼", label: "Gestión" },
  { value: "emoji:🧑‍🔧", label: "Técnico" },
  { value: "emoji:🧑‍🏭", label: "Fábrica" },
  { value: "emoji:🦺", label: "Seguridad" },
  { value: "emoji:🏗️", label: "Proyecto" }
];

export default function Account() {
  const { user, updateAvatar } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seleccioná un archivo de imagen.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateAvatar(String(reader.result));
      toast.success("Foto de perfil actualizada.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="senal">Configuración</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consultá los datos de tu cuenta y elegí cómo querés verte en el sistema.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Imagen de perfil</CardTitle>
            <CardDescription>Subí una foto o elegí un avatar 2D.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                user={user}
                className="size-20"
                fallbackClassName="text-3xl"
              />
              <div className="space-y-2">
                <Button variant="outline" className="gap-2" onClick={() => fileInput.current?.click()}>
                  <Upload className="size-4" /> Subir foto
                </Button>
                <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
                <p className="text-[11px] text-muted-foreground">JPG, PNG o WebP · máx. 1 MB</p>
              </div>
            </div>

            <div>
              <div className="senal senal-muted mb-3">Avatares 2D</div>
              <div className="grid grid-cols-3 gap-2">
                {AVATARS.map((avatar) => {
                  const selected = user.avatar === avatar.value;
                  return (
                    <button
                      key={avatar.value}
                      type="button"
                      onClick={() => updateAvatar(avatar.value)}
                      aria-label={`Usar avatar ${avatar.label}`}
                      aria-pressed={selected}
                      className={`relative grid aspect-square place-items-center rounded-xl border text-2xl transition-all hover:bg-muted ${selected ? "border-primary bg-accent" : ""}`}
                    >
                      {avatar.value.replace("emoji:", "")}
                      {selected && <Check className="absolute right-1.5 bottom-1.5 size-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {user.avatar && (
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => updateAvatar()}>
                <RotateCcw className="size-3.5" /> Volver a iniciales
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información de la cuenta</CardTitle>
            <CardDescription>Estos datos son administrados por el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              ["Nombre", user.displayName],
              ["Usuario / CI", user.username],
              ["Rol", ROLE_LABELS[user.role]],
              ["Departamento", user.department],
              ["Cargo", user.positionTitle]
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-5 border-b py-3 last:border-0">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-right text-sm font-medium">{value}</span>
              </div>
            ))}
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-estado-progreso/10 p-3 text-estado-progreso">
              <ShieldCheck className="size-5" />
              <div>
                <div className="text-sm font-semibold">Cuenta activa</div>
                <div className="text-xs opacity-80">Acceso habilitado según tu rol.</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card size="sm">
        <CardContent className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
            {user.avatar ? <Camera className="size-4" /> : <IdCard className="size-4" />}
          </div>
          <p className="text-xs text-muted-foreground">
            La imagen elegida se guarda localmente en este dispositivo durante la fase de diseño.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
