import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, BadgeCheck, KeyRound, MailCheck, ShieldQuestion } from "lucide-react";
import { useAuth } from "@/context/auth";
import { APP_VERSION_LABEL } from "@/lib/app-info";
import { ROLE_LABELS } from "@/lib/roles";
import { usuarios, type Usuario } from "@/mocks/data";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [ci, setCi] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryUser, setRecoveryUser] = useState<Usuario | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = login(usuario, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/dashboard");
  };

  const buscarCuenta = (event: FormEvent) => {
    event.preventDefault();
    const account = usuarios.find((candidate) => candidate.username === ci.trim());
    if (!account) {
      setRecoveryError("No encontramos una cuenta asociada a ese número de CI.");
      return;
    }
    if (!account.isActive) {
      setRecoveryError("La cuenta está inactiva. Contactá a soporte para recuperar el acceso.");
      return;
    }
    setRecoveryError("");
    setRecoveryUser(account);
  };

  const closeRecovery = (open: boolean) => {
    setRecoveryOpen(open);
    if (!open) {
      setCi("");
      setRecoveryError("");
      setRecoveryUser(null);
    }
  };

  const usesEmailVerification = recoveryUser?.role !== "viewer";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0060af] p-10 text-white lg:flex">
        <div>
          <div className="inline-flex rounded-xl bg-white px-5 py-3 shadow-lg shadow-black/10">
            <img src="/brand/italplast-wordmark.webp" alt="Italplast" className="h-10 w-auto" />
          </div>
          <h1 className="mt-10 max-w-lg font-heading text-4xl leading-[1.05] font-bold" style={{ fontStretch: "112%" }}>
            Gestión de proyectos
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">
            Planificá, coordiná y seguí cada proyecto desde un único espacio,
            preparado para acompañar nuevas líneas de producto.
          </p>
        </div>

        <div>
          <div className="font-heading text-sm font-semibold text-white/85">{APP_VERSION_LABEL}</div>
          <div className="mt-1 text-xs text-white/45">Sistema de gestión Italplast</div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-24 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, white 0 1px, transparent 1px 12px)" }}
        />
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/brand/italplast-wordmark.webp" alt="Italplast" className="h-9 w-auto" />
            <h1 className="mt-3 font-heading text-2xl font-bold">Gestión de proyectos</h1>
          </div>

          <h2 className="font-heading text-xl font-bold tracking-tight">Iniciá sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá con tu usuario y contraseña.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="documento">Documento</Label>
              <Input
                id="documento"
                value={usuario}
                onChange={(event) => { setUsuario(event.target.value); setError(""); }}
                placeholder="Tu número de documento"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(""); }}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setRecoveryOpen(true)}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                ¿No recordás tu contraseña?
              </button>
            </div>

            {error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full gap-2">
              Iniciar sesión <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-8 text-center text-xs text-muted-foreground lg:hidden">{APP_VERSION_LABEL}</div>
        </div>
      </main>

      <Dialog open={recoveryOpen} onOpenChange={closeRecovery}>
        <DialogContent>
          {!recoveryUser ? (
            <form onSubmit={buscarCuenta} className="contents">
              <DialogHeader>
                <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShieldQuestion className="size-5" />
                </div>
                <DialogTitle>Recuperar contraseña</DialogTitle>
                <DialogDescription>
                  Ingresá tu CI para identificar tu cuenta y definir el método de recuperación disponible.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-2">
                <Label htmlFor="recovery-ci">Número de CI</Label>
                <Input
                  id="recovery-ci"
                  value={ci}
                  onChange={(event) => { setCi(event.target.value); setRecoveryError(""); }}
                  placeholder="Ej. 3748633"
                  inputMode="numeric"
                  autoFocus
                  required
                />
                {recoveryError && <p role="alert" className="pt-1 text-xs text-destructive">{recoveryError}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" className="gap-2">Continuar <ArrowRight className="size-4" /></Button>
              </DialogFooter>
            </form>
          ) : (
            <>
              <DialogHeader>
                <div className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  {usesEmailVerification ? <MailCheck className="size-5" /> : <KeyRound className="size-5" />}
                </div>
                <DialogTitle>Cuenta identificada</DialogTitle>
                <DialogDescription>
                  {recoveryUser.displayName} · {ROLE_LABELS[recoveryUser.role]}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border bg-muted/35 p-4">
                <div className="flex gap-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <div className="text-sm font-semibold">
                      {usesEmailVerification ? "Verificación por correo" : "Solicitud de cambio registrada"}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {usesEmailVerification
                        ? "Se enviará un enlace de verificación al correo registrado en la cuenta para crear una nueva contraseña."
                        : "Un administrador validará tu identidad y gestionará el cambio de contraseña. Recibirás una confirmación cuando esté listo."}
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => closeRecovery(false)}>Entendido</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
