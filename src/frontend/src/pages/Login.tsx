import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, HardHat, ClipboardCheck, Eye } from "lucide-react";
import { useAuth } from "@/context/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { usuariosDemo, proyectos } from "@/mocks/data";
import { avanceGeneral } from "@/mocks/data";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROL_ICONOS: Record<Role, typeof HardHat> = {
  administrator: ClipboardCheck,
  supervisor: HardHat,
  viewer: Eye
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [rolElegido, setRolElegido] = useState<Role>("administrator");

  const entrar = (rol: Role) => {
    login(rol);
    navigate("/dashboard");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    entrar(rolElegido); // Fase 2: login simulado, cualquier credencial entra
  };

  const enCurso = proyectos.filter((p) => p.estado === "en_progreso");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca: el estado de la planta, hoy */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.19_0.03_318)] p-10 text-white lg:flex">
        <div>
          <div className="senal !text-white/60">Italplast · Aberturas PVC y ALU</div>
          <h1 className="mt-3 max-w-md font-heading text-4xl leading-[1.05] font-bold" style={{ fontStretch: "112%" }}>
            Control de Obras
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/65">
            De la línea de producción a la obra: cada abertura, cada etapa,
            un solo tablero.
          </p>
        </div>

        <div className="space-y-5">
          <div className="senal !text-white/50">Hoy en curso</div>
          {enCurso.map((p) => (
            <div key={p.id}>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium text-white/90">{p.nombre}</span>
                <span className="cifra text-xs text-white/55">{p.ubicacion.split(",")[1] ?? p.ubicacion}</span>
              </div>
              <AvanceMeter valor={avanceGeneral(p)} etapas={6} size="sm" mostrarCifra={false} className="[&_[role=progressbar]]:bg-white/12" />
            </div>
          ))}
        </div>

        {/* Trama de perfiles de aluminio */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-24 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, white 0 1px, transparent 1px 12px)" }}
        />
      </aside>

      {/* Formulario */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="senal">Italplast</div>
            <h1 className="font-heading text-2xl font-bold">Control de Obras</h1>
          </div>

          <h2 className="font-heading text-xl font-bold tracking-tight">Iniciá sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fase de diseño — elegí un rol para recorrer su flujo.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="usuario">Usuario</Label>
              <Input id="usuario" placeholder="Tu número de documento" autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" />
            </div>

            <div className="space-y-2 pt-1">
              <div className="senal senal-muted">Entrar como</div>
              <div className="grid gap-2">
                {(Object.keys(ROLE_LABELS) as Role[]).map((rol) => {
                  const Icono = ROL_ICONOS[rol];
                  const demo = usuariosDemo[rol];
                  const activo = rolElegido === rol;
                  return (
                    <button
                      key={rol}
                      type="button"
                      onClick={() => setRolElegido(rol)}
                      aria-pressed={activo}
                      className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                        activo ? "border-primary bg-accent" : "hover:bg-muted/60"
                      }`}
                    >
                      <Icono className={`size-4.5 ${activo ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.75} />
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{ROLE_LABELS[rol]}</span>
                        <span className="block text-xs text-muted-foreground">
                          {demo.displayName} · {demo.positionTitle}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button type="submit" className="w-full gap-2">
              Iniciar sesión <ArrowRight className="size-4" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
