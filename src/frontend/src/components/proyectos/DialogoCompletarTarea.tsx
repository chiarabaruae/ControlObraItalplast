// Diálogo compartido para completar una tarea de seguimiento.
// Evidencia obligatoria: las tareas de etapas de fabricación/instalación
// exigen fotografía; solo las tareas generales del proyecto (grupo
// "generales") admiten además documentos (PDF, Word, Excel, CSV, texto) o un
// enlace externo (D-031). Observaciones opcionales (si se escriben, mínimo 50
// caracteres). Reabrir exige SIEMPRE un motivo de al menos 50 caracteres (sin
// importar el rol) y registra quién reabre y cuándo. Lo usan el detalle del
// proyecto y la sección Tareas.
import { useEffect, useState } from "react";
import { Check, FileText, ImageIcon, Link2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ACCEPT_EVIDENCIA, crearEvidenciaEnlace, prepararEvidencia } from "@/lib/evidencias";
import { descripcionJustificacion, justificacionValida } from "@/lib/justificaciones";
import { registrarModificacionTarea, type EvidenciaTarea, type TareaPresupuesto } from "@/mocks/data";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Vista de una evidencia guardada según su tipo: imagen, enlace o documento. */
function VistaEvidencia({ evidencia, etiqueta }: { evidencia: EvidenciaTarea; etiqueta: string }) {
  if (evidencia.esEnlace) {
    return (
      <a
        href={evidencia.dataUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium text-primary hover:underline"
      >
        <Link2 className="size-4 shrink-0" />
        <span className="truncate">{evidencia.nombre}</span>
      </a>
    );
  }
  if (evidencia.tipo.startsWith("image/")) {
    return (
      <img
        src={evidencia.dataUrl}
        alt={`Evidencia de ${etiqueta}`}
        className="max-h-72 w-full rounded-lg border object-contain"
      />
    );
  }
  return (
    <a
      href={evidencia.dataUrl}
      download={evidencia.nombre}
      className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium text-primary hover:underline"
    >
      <FileText className="size-4 shrink-0" />
      <span className="truncate">{evidencia.nombre}</span>
    </a>
  );
}

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
  const [enlace, setEnlace] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [motivoReapertura, setMotivoReapertura] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setArchivo(undefined);
    setEnlace("");
    setObservaciones(tarea?.observaciones ?? "");
    setMotivoReapertura("");
  }, [tarea?.id, tarea?.observaciones]);

  // Solo las tareas generales del proyecto admiten documentos y enlaces (D-031);
  // las tareas de etapas de fabricación/instalación exigen fotografía.
  const admiteMultiformato = tarea?.grupo === "generales";
  // Excepción de fábrica: sus tareas se marcan como listas solo con el check,
  // sin exigir fotografía. La evidencia sigue siendo obligatoria en obra.
  const esFabrica = tarea?.grupo === "fabrica" || tarea?.grupo === "fabricacion_premarcos";
  const hayEvidencia = Boolean(archivo || (admiteMultiformato && enlace.trim()) || tarea?.evidencia);
  const puedeCompletar = esFabrica || hayEvidencia;

  const completar = async () => {
    if (!tarea || !puedeCompletar) return;
    // Observaciones opcionales, pero si se escriben deben justificar (D-031).
    if (observaciones.trim() && !justificacionValida(observaciones)) {
      toast("Observación demasiado corta", { description: descripcionJustificacion(observaciones) });
      return;
    }
    setGuardando(true);
    try {
      const evidencia = archivo
        ? await prepararEvidencia(archivo, { soloImagen: !admiteMultiformato })
        : admiteMultiformato && enlace.trim()
          ? crearEvidenciaEnlace(enlace)
          : tarea.evidencia;
      if (!evidencia && !esFabrica) return;
      alGuardar(registrarModificacionTarea({
        ...tarea,
        completada: true,
        evidencia,
        observaciones: observaciones.trim(),
        completadaEn: new Date().toISOString(),
        completadaPorId: usuarioId
      }, usuarioId, evidencia ? "Completó la tarea con evidencia" : "Marcó la tarea como lista"));
      toast("Tarea completada", { description: evidencia ? `${etiqueta} · evidencia guardada.` : etiqueta });
      alCerrar();
    } catch (error) {
      toast("No se pudo guardar la evidencia", {
        description: error instanceof Error ? error.message : "Probá con otro archivo o enlace."
      });
    } finally {
      setGuardando(false);
    }
  };

  const reabrir = () => {
    const motivo = motivoReapertura.trim();
    if (!tarea || !justificacionValida(motivo)) return;
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
            <VistaEvidencia evidencia={tarea.evidencia} etiqueta={etiqueta} />
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {tarea.evidencia.esEnlace
                  ? <Link2 className="size-4" />
                  : tarea.evidencia.tipo.startsWith("image/")
                    ? <ImageIcon className="size-4" />
                    : <FileText className="size-4" />}
                <span className="truncate">{tarea.evidencia.nombre}</span>
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
                  placeholder="Para reabrir la tarea explicá el motivo con detalle. Es obligatorio."
                />
                <p className="text-xs text-muted-foreground">
                  Se registra quién reabre, la fecha y el motivo. {descripcionJustificacion(motivoReapertura)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="evidencia-tarea">
                {esFabrica ? "Evidencia fotográfica (opcional)" : admiteMultiformato ? "Evidencia *" : "Evidencia fotográfica *"}
              </Label>
              <Input
                id="evidencia-tarea"
                type="file"
                accept={admiteMultiformato ? ACCEPT_EVIDENCIA : "image/*"}
                onChange={(evento) => setArchivo(evento.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                {esFabrica
                  ? "En fábrica alcanza con marcar la tarea como lista; la foto es opcional."
                  : admiteMultiformato
                    ? "Imagen, PDF, Word, Excel, CSV o texto. Las imágenes se comprimen (máx. 12 MB); los documentos hasta 4 MB."
                    : "Se comprime localmente antes de guardarse. Máximo 12 MB."}
              </p>
            </div>
            {admiteMultiformato && (
              <div className="space-y-1.5">
                <Label htmlFor="enlace-evidencia">…o pegá un enlace</Label>
                <Input
                  id="enlace-evidencia"
                  type="url"
                  value={enlace}
                  onChange={(evento) => setEnlace(evento.target.value)}
                  placeholder="https://drive.google.com/…"
                  disabled={Boolean(archivo)}
                />
                <p className="text-xs text-muted-foreground">
                  Si adjuntás un archivo, el enlace se ignora.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="observaciones-tarea">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones-tarea"
                value={observaciones}
                onChange={(evento) => setObservaciones(evento.target.value)}
                placeholder="Detalles, medidas o incidencias relevantes…"
              />
              {observaciones.trim() !== "" && (
                <p className="text-xs text-muted-foreground">{descripcionJustificacion(observaciones)}</p>
              )}
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
                disabled={!justificacionValida(motivoReapertura)}
              >
                <RotateCcw className="size-4" /> Reabrir tarea
              </Button>
            )
          ) : (
            <Button
              className="gap-2"
              onClick={() => void completar()}
              disabled={guardando || !puedeCompletar}
            >
              <Check className="size-4" /> {guardando ? "Guardando…" : "Marcar como lista"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
