import { useMemo, useState } from "react";
import { Camera, Check, Factory, HardHat, ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { prepararEvidencia } from "@/lib/evidencias";
import { ETIQUETAS_GRUPO, porcentajeTareas } from "@/lib/seguimiento-presupuesto";
import {
  nombreTipoProducto,
  type GrupoTareaPresupuesto,
  type Proyecto,
  type TareaPresupuesto
} from "@/mocks/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const GRUPOS_FABRICA: GrupoTareaPresupuesto[] = ["fabricacion_premarcos", "fabrica"];
const GRUPOS_INSTALACION: GrupoTareaPresupuesto[] = ["instalacion_premarcos", "instalacion"];

function MatrizGrupo({
  proyecto,
  grupo,
  tipoProducto,
  puedeEditar,
  alSeleccionar
}: {
  proyecto: Proyecto;
  grupo: GrupoTareaPresupuesto;
  tipoProducto: TareaPresupuesto["tipoProducto"];
  puedeEditar: boolean;
  alSeleccionar: (tarea: TareaPresupuesto) => void;
}) {
  const tareas = proyecto.tareasPresupuesto?.filter(
    (tarea) => tarea.grupo === grupo && tarea.tipoProducto === tipoProducto
  ) ?? [];
  const etapas = [...new Set(tareas.map((tarea) => tarea.etapa))];
  const idsItems = [...new Set(tareas.map((tarea) => tarea.itemId))];
  const items = idsItems.flatMap((id) => {
    const item = proyecto.presupuestoEjecutivo?.items.find((actual) => actual.id === id);
    return item ? [item] : [];
  });
  if (tareas.length === 0) return null;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading text-base">{ETIQUETAS_GRUPO[grupo]}</CardTitle>
          <span className="cifra text-sm font-semibold">{porcentajeTareas(tareas)}%</span>
        </div>
        <Progress value={porcentajeTareas(tareas)} />
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-52 bg-card">Componente</TableHead>
                {etapas.map((etapa) => <TableHead key={etapa} className="min-w-36 text-center">{etapa}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <div className="font-medium">{item.codigo || `Pos. ${item.posicion}`}</div>
                    <div className="mt-0.5 max-w-48 truncate text-xs text-muted-foreground">
                      {item.ambiente || item.descripcion} · {item.cantidad} un.
                    </div>
                  </TableCell>
                  {etapas.map((etapa) => {
                    const tarea = tareas.find((actual) => actual.itemId === item.id && actual.etapa === etapa);
                    if (!tarea) return <TableCell key={etapa} className="text-center text-muted-foreground">—</TableCell>;
                    return (
                      <TableCell key={etapa} className="text-center">
                        <Button
                          type="button"
                          variant={tarea.completada ? "default" : "outline"}
                          size="icon"
                          className="size-9"
                          onClick={() => alSeleccionar(tarea)}
                          disabled={!puedeEditar}
                          aria-label={`${tarea.completada ? "Ver evidencia de" : "Completar"} ${etapa} para ${item.codigo}`}
                        >
                          {tarea.completada ? <Check className="size-4" /> : <Camera className="size-4" />}
                        </Button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SeguimientoPresupuesto({
  proyecto,
  lado,
  puedeEditar,
  usuarioId,
  alActualizar
}: {
  proyecto: Proyecto;
  lado: "fabrica" | "instalacion";
  puedeEditar: boolean;
  usuarioId: string;
  alActualizar: (tarea: TareaPresupuesto) => void;
}) {
  const grupos = lado === "fabrica" ? GRUPOS_FABRICA : GRUPOS_INSTALACION;
  const Icono = lado === "fabrica" ? Factory : HardHat;
  const [seleccionada, setSeleccionada] = useState<TareaPresupuesto>();
  const [archivo, setArchivo] = useState<File>();
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const productos = useMemo(
    () => proyecto.productos?.filter((producto) => producto.tipo !== "servicios") ?? [],
    [proyecto.productos]
  );

  const abrir = (tarea: TareaPresupuesto) => {
    setSeleccionada(tarea);
    setArchivo(undefined);
    setObservaciones(tarea.observaciones ?? "");
  };

  const cerrar = () => {
    setSeleccionada(undefined);
    setArchivo(undefined);
    setObservaciones("");
  };

  const completar = async () => {
    if (!seleccionada || (!archivo && !seleccionada.evidencia)) return;
    setGuardando(true);
    try {
      const evidencia = archivo ? await prepararEvidencia(archivo) : seleccionada.evidencia;
      if (!evidencia) return;
      alActualizar({
        ...seleccionada,
        completada: true,
        evidencia,
        observaciones: observaciones.trim(),
        completadaEn: new Date().toISOString(),
        completadaPorId: usuarioId
      });
      toast("Tarea completada", { description: `${seleccionada.etapa} · evidencia guardada.` });
      cerrar();
    } catch (error) {
      toast("No se pudo guardar la evidencia", {
        description: error instanceof Error ? error.message : "Probá con otra imagen."
      });
    } finally {
      setGuardando(false);
    }
  };

  const reabrir = () => {
    if (!seleccionada) return;
    alActualizar({
      ...seleccionada,
      completada: false,
      completadaEn: undefined,
      completadaPorId: undefined
    });
    toast("Tarea reabierta", { description: seleccionada.etapa });
    cerrar();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icono className="size-5" /></div>
          <div>
            <h2 className="font-heading font-semibold">Seguimiento de {lado === "fabrica" ? "fábrica" : "instalación"}</h2>
            <p className="text-xs text-muted-foreground">Cada celda requiere evidencia para quedar completada.</p>
          </div>
        </div>
        <div className="text-right">
          <div className="cifra text-xl font-bold">{porcentajeTareas(proyecto.tareasPresupuesto ?? [], grupos)}%</div>
          <div className="text-xs text-muted-foreground">avance automático</div>
        </div>
      </div>

      {productos.map((producto) => {
        const tieneTareas = proyecto.tareasPresupuesto?.some(
          (tarea) => tarea.tipoProducto === producto.tipo && grupos.includes(tarea.grupo)
        );
        if (!tieneTareas) return null;
        return (
          <section key={producto.tipo} className="space-y-3">
            <div>
              <div className="senal">Producto</div>
              <h3 className="mt-1 font-heading text-lg font-semibold">{nombreTipoProducto(producto.tipo)}</h3>
            </div>
            {grupos.map((grupo) => (
              <MatrizGrupo
                key={`${producto.tipo}-${grupo}`}
                proyecto={proyecto}
                grupo={grupo}
                tipoProducto={producto.tipo}
                puedeEditar={puedeEditar}
                alSeleccionar={abrir}
              />
            ))}
          </section>
        );
      })}

      <Dialog open={Boolean(seleccionada)} onOpenChange={(abierto) => !abierto && cerrar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{seleccionada?.completada ? "Evidencia de la tarea" : "Completar tarea"}</DialogTitle>
            <DialogDescription>
              {seleccionada ? `${seleccionada.etapa} · ${ETIQUETAS_GRUPO[seleccionada.grupo]}` : ""}
            </DialogDescription>
          </DialogHeader>

          {seleccionada?.completada && seleccionada.evidencia ? (
            <div className="space-y-3">
              <img src={seleccionada.evidencia.dataUrl} alt={`Evidencia de ${seleccionada.etapa}`} className="max-h-72 w-full rounded-lg border object-contain" />
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 font-medium"><ImageIcon className="size-4" /> {seleccionada.evidencia.nombre}</div>
                <p className="mt-2 text-muted-foreground">{seleccionada.observaciones || "Sin observaciones."}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="evidencia-tarea">Evidencia fotográfica *</Label>
                <Input id="evidencia-tarea" type="file" accept="image/*" onChange={(e) => setArchivo(e.target.files?.[0])} />
                <p className="text-xs text-muted-foreground">Se comprime localmente antes de guardarse. Máximo 12 MB.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="observaciones-tarea">Observaciones (opcional)</Label>
                <Textarea id="observaciones-tarea" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Detalles, medidas o incidencias relevantes…" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>Cerrar</Button>
            {seleccionada?.completada ? (
              <Button variant="outline" className="gap-2" onClick={reabrir}><RotateCcw className="size-4" /> Reabrir tarea</Button>
            ) : (
              <Button className="gap-2" onClick={() => void completar()} disabled={guardando || (!archivo && !seleccionada?.evidencia)}>
                <Check className="size-4" /> {guardando ? "Guardando…" : "Marcar como lista"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

