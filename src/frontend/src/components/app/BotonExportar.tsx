import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonExportar({
  onClick,
  label = "Descargar a Excel"
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Download className="size-4" />
    </Button>
  );
}
