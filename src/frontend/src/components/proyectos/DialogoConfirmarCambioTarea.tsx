import { AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DialogoConfirmarCambioTarea({
  abierto,
  titulo,
  descripcion,
  etiquetaConfirmar = "Confirmar cambio",
  variante = "default",
  alCancelar,
  alConfirmar
}: {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  etiquetaConfirmar?: string;
  variante?: "default" | "destructive";
  alCancelar: () => void;
  alConfirmar: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(abiertoNuevo) => !abiertoNuevo && alCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-primary" /> {titulo}
          </DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={alCancelar}>Cancelar</Button>
          <Button variant={variante} onClick={alConfirmar}>{etiquetaConfirmar}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
