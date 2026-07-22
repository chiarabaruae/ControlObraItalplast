// Diálogo compartido para completar una tarea de seguimiento:
// evidencia fotográfica obligatoria + observaciones opcionales.
// Reabrir exige SIEMPRE un motivo (sin importar el rol) y registra
// quién reabre y cuándo. Lo usan el detalle del proyecto y la sección Tareas.
import { useEffect, useState } from "react";
import { Check, ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { prepararEvidencia } from "@/lib/evidencias";
import { registrarModificacionTarea, type TareaPresupuesto } from "@/mocks/data";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DialogoCompletarTarea({
  tarea,
  etiqueta,
  usuarioId,
  alCerrar,
  alGuardar,
  puedeReabrir = true
}: {
  tarea: TareaPresupuesto | undefined;
  etiqueta: string;
  usuarioId: string;
  alCerrar: () => void;
  alGuardar: (tarea: TareaPresupuesto) => void;
  puedeReabrir?: boolean;
}) {
  const [archivo, setArchivo] = useState<File>();
  const [observaciones, setObservaciones] = useState("");
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setArchivo(undefined);
    setObservaciones(tarea?.observaciones ?? "");
    setMotivoReapertura("");
  }, [tarea?.id, tarea?.observaciones]);

  const completar = async () => {
    if (!tarea || (!archivo && !tarea.evidencia)) return;
    setGuardando(true);
    try {
      const evidencia = archivo ? await prepararEvidencia(archivo) : tarea.evidencia;
      if (!evidencia) return;
      alGuardar(registrarModificacionTarea({
        ...tarea,
        completada: true,
        evidencia,
        observaciones: observaciones.trim(),
        completadaEn: new Date().toISOString(),
        completadaPorId: usuarioId
      }, usuarioId, "Completó la tarea con evidencia"));
      toast("Tarea completada", { description: `${etiqueta} · evidencia guardada.` });
      alCerrar();
    } catch (error) {
      toast("No se pudo guardar la evidencia", {
        description: error instanceof Error ? error.message : "Probá con otra imagen."
      });
    } finally {
      setGuardando(false);
    }
  };

  const reabrir = () => {
    const motivo = motivoReapertura.trim();
    if (!tarea || !motivo) return;
    alGuardar(registrarModificacionTarea({
      ...tarea,
      completada: false,
      completadaEn: undefined,
      completadaPorId: undefined,
      reaperturas: [
        ...(tarea.reaperturas ?? []),
        { fecha: new Date().toISOString(), usuarioId, motivo }
      ]
    }, usuarioId, `Reabrió la tarea: ${motivo}`));
    toast("Tarea reabierta", { description: etiqueta });
    alCerrar();
  };

  return (
    <Dialog open={Boolean(tarea)} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tarea?.completada ? "Evidencia de la tarea" : "Completar tarea"}</DialogTitle>
          <DialogDescription>{etiqueta}</DialogDescription>
        </DialogHeader>

        {tarea?.completada && tarea.evidencia ? (
          <div className="space-y-3">
            <img
              src={tarea.evidencia.dataUrl}
              alt={`Evidencia de ${etiqueta}`}
              className="max-h-72 w-full rounded-lg border object-contain"
            />
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ImageIcon className="size-4" /> {tarea.evidencia.nombre}
              </div>
              <p className="mt-2 text-muted-foreground">{tarea.observaciones || "Sin observaciones."}</p>
            </div>
            {puedeReabrir && (
              <div className="space-y-1.5">
                <Label htmlFor="motivo-reapertura">Motivo de reapertura *</Label>
                <Textarea
                  id="motivo-reapertura"
                  value={motivoReapertura}
                  onChange={(evento) => setMotivoReapertura(evento.target.value)}
                  placeholder="Para reabrir la tarea explicá el motivo. Es obligatorio."
                />
                <p className="text-xs text-muted-foreground">
                  Se registra quién reabre, la fecha y el motivo.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="evidencia-tarea">Evidencia fotográfica *</Label>
              <Input
                id="evidencia-tarea"
                type="file"
                accept="image/*"
                onChange={(evento) => setArchivo(evento.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                Se comprime localmente antes de guardarse. Máximo 12 MB.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observaciones-tarea">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones-tarea"
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                placeholder="Detalles, medidas o incidencias relevantes…"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>Cerrar</Button>
          {tarea?.completada ? (
            puedeReabrir && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={reabrir}
                disabled={!motivoReapertura.trim()}
              >
                <RotateCcw className="size-4" /> Reabrir tarea
              </Button>
            )
          ) : (
            <Button
              className="gap-2"
              onClick={() => void completar()}
              disabled={guardando || (!archivo && !tarea?.evidencia)}
            >
              <Check className="size-4" /> {guardando ? "Guardando…" : "Marcar como lista"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
