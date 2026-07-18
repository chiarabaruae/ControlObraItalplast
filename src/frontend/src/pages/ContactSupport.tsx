import { useState, type FormEvent } from "react";
import { Headphones, MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactSupport() {
  const [sending, setSending] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      form.reset();
      toast.success("Solicitud enviada", { description: "El equipo de soporte revisará tu consulta." });
    }, 450);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="senal">Support</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Contact support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contanos qué necesitás y enviaremos la solicitud al equipo responsable.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
        <Card className="relative overflow-hidden bg-primary text-primary-foreground">
          <CardContent className="relative z-10 flex h-full min-h-72 flex-col justify-between py-2">
            <div className="grid size-16 place-items-center rounded-2xl bg-white/15">
              <Headphones className="size-8" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-65">
                <Sparkles className="size-3.5" /> Estamos para ayudarte
              </div>
              <h2 className="mt-3 text-2xl font-bold">Una consulta clara nos ayuda a responder más rápido.</h2>
              <p className="mt-3 text-sm leading-relaxed opacity-70">
                Incluí la pantalla, el proyecto y el resultado que esperabas obtener.
              </p>
            </div>
          </CardContent>
          <MessageCircle aria-hidden className="absolute -right-8 -bottom-8 size-44 opacity-[0.08]" />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nueva solicitud</CardTitle>
            <CardDescription>Los campos ayudan a dirigir tu consulta correctamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="support-subject">Asunto</Label>
                <Input id="support-subject" name="subject" placeholder="Ej. No puedo actualizar una tarea" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-category">Categoría</Label>
                <select
                  id="support-category"
                  name="category"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 dark:bg-input/30"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>Seleccioná una opción</option>
                  <option value="access">Acceso y cuenta</option>
                  <option value="projects">Proyectos y documentos</option>
                  <option value="tasks">Tareas y seguimiento</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-detail">Descripción</Label>
                <Textarea id="support-detail" name="detail" className="min-h-28" placeholder="Describí lo ocurrido y qué necesitás resolver..." required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={sending}>
                <Send className="size-4" /> {sending ? "Enviando..." : "Enviar solicitud"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
