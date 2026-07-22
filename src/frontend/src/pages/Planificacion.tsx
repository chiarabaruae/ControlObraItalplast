import { useState } from "react";
import { CalendarClock, RotateCcw, Save } from "lucide-react";
import {
  BUFFERS_PREDETERMINADOS,
  guardarBuffersPlanificacion,
  obtenerBuffersPlanificacion,
  type BuffersPlanificacion
} from "@/lib/planificacion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CAMPOS: { clave: keyof BuffersPlanificacion; label: string; descripcion: string }[] = [
  {
    clave: "diasProduccionAInstalacion",
    label: "Fin de producción → inicio de instalación",
    descripcion: "La producción debe terminar esta cantidad de días antes de comenzar la instalación."
  },
  {
    clave: "diasAbacoAFabrica",
    label: "Firma de ábaco → entrada a fábrica",
    descripcion: "El ábaco debe firmarse esta cantidad de días antes de que el pedido entre a fábrica."
  },
  {
    clave: "diasPremarcosAAbaco",
    label: "Entrega de premarcos → firma de ábaco",
    descripcion: "Los premarcos deben entregarse en obra esta cantidad de días antes de la firma del ábaco."
  }
];

export default function Planificacion() {
  const [valores, setValores] = useState<Record<keyof BuffersPlanificacion, string>>(() => {
    const actuales = obtenerBuffersPlanificacion();
    return {
      diasProduccionAInstalacion: String(actuales.diasProduccionAInstalacion),
      diasAbacoAFabrica: String(actuales.diasAbacoAFabrica),
      diasPremarcosAAbaco: String(actuales.diasPremarcosAAbaco)
    };
  });

  const guardar = () => {
    const buffers = {} as BuffersPlanificacion;
    for (const campo of CAMPOS) {
      const numero = Number(valores[campo.clave]);
      if (!Number.isInteger(numero) || numero < 0) {
        toast("Revisá las brechas", { description: `"${campo.label}" necesita un número entero de días (0 o más).` });
        return;
      }
      buffers[campo.clave] = numero;
    }
    guardarBuffersPlanificacion(buffers);
    toast("Planificación guardada", { description: "Las nuevas brechas se aplicarán a las próximas estimaciones de fechas." });
  };

  const restaurar = () => {
    setValores({
      diasProduccionAInstalacion: String(BUFFERS_PREDETERMINADOS.diasProduccionAInstalacion),
      diasAbacoAFabrica: String(BUFFERS_PREDETERMINADOS.diasAbacoAFabrica),
      diasPremarcosAAbaco: String(BUFFERS_PREDETERMINADOS.diasPremarcosAAbaco)
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Configuración</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Planificación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Brechas de días del cálculo backward: desde la fecha comprometida de inicio de instalación se estiman,
          hacia atrás, las fechas de producción, firma de ábaco y premarcos.
        </p>
      </header>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <CardTitle>Brechas entre hitos</CardTitle>
              <CardDescription>Reglas de negocio globales; solo administración puede modificarlas.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {CAMPOS.map((campo) => (
            <div key={campo.clave} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Label htmlFor={`buffer-${campo.clave}`} className="text-sm font-semibold">{campo.label}</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">{campo.descripcion}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id={`buffer-${campo.clave}`}
                  type="number"
                  min={0}
                  step={1}
                  value={valores[campo.clave]}
                  onChange={(evento) => setValores((previos) => ({ ...previos, [campo.clave]: evento.target.value }))}
                  className="w-24 text-right"
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="gap-2" onClick={restaurar}>
              <RotateCcw className="size-4" /> Restaurar predeterminados
            </Button>
            <Button className="gap-2" onClick={guardar}>
              <Save className="size-4" /> Guardar cambios
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Los cambios afectan solo a las estimaciones futuras; las fechas ya asignadas a tareas existentes no se recalculan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
