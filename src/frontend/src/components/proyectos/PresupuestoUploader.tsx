import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, FileCheck2, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { parsearPresupuesto } from "@/lib/presupuesto-parser";
import {
  nombreTipoProducto,
  type ItemPresupuesto,
  type PresupuestoEjecutivo,
  type TipoProducto
} from "@/mocks/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const FORMATOS = {
  tabla_excel: "Tabla de presupuesto",
  preference: "Oferta Preference",
  preference_mercosul: "Propuesta Preference Mercosul",
  desconocido: "Formato no reconocido"
};

function tipoPermitido(item: ItemPresupuesto, tipos: TipoProducto[]) {
  if (tipos.includes(item.tipoProducto)) return item.tipoProducto;
  return tipos.find((tipo) => tipo !== "servicios") ?? tipos[0] ?? item.tipoProducto;
}

function nuevoItem(tipos: TipoProducto[]): ItemPresupuesto {
  const id = `item-manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    posicion: "",
    codigo: "",
    ambiente: "",
    cantidad: 1,
    ancho: 0,
    alto: 0,
    descripcion: "",
    serie: "",
    color: "",
    vidrio: "",
    tipoProducto: tipos.find((tipo) => tipo !== "servicios") ?? tipos[0] ?? "servicios"
  };
}

export function PresupuestoUploader({
  valor,
  tiposSeleccionados,
  alCambiar
}: {
  valor?: PresupuestoEjecutivo;
  tiposSeleccionados: TipoProducto[];
  alCambiar: (valor?: PresupuestoEjecutivo) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!valor || tiposSeleccionados.length === 0) return;
    const items = valor.items.map((item) => ({
      ...item,
      tipoProducto: tipoPermitido(item, tiposSeleccionados)
    }));
    if (items.some((item, indice) => item.tipoProducto !== valor.items[indice].tipoProducto)) {
      alCambiar({ ...valor, items });
    }
  }, [tiposSeleccionados, valor, alCambiar]);

  const cargar = async (archivo?: File) => {
    if (!archivo) return;
    if (archivo.type !== "application/pdf" && !archivo.name.toLocaleLowerCase().endsWith(".pdf")) {
      toast("Archivo no válido", { description: "Seleccioná un presupuesto ejecutivo en formato PDF." });
      return;
    }
    if (archivo.size > 25 * 1024 * 1024) {
      toast("PDF demasiado grande", { description: "El tamaño máximo admitido en esta fase es 25 MB." });
      return;
    }

    setProcesando(true);
    try {
      const { extraerLineasPdf } = await import("@/lib/pdf-text");
      const lineas = await extraerLineasPdf(archivo);
      const presupuesto = parsearPresupuesto(lineas, archivo);
      const items = presupuesto.items.map((item) => ({
        ...item,
        tipoProducto: tipoPermitido(item, tiposSeleccionados)
      }));
      alCambiar({ ...presupuesto, items });
      if (items.length === 0) {
        toast("No se detectaron componentes", {
          description: "Podés agregar filas manualmente o probar con otra versión del presupuesto."
        });
      } else {
        toast("Presupuesto leído", {
          description: `${items.length} componente${items.length === 1 ? "" : "s"} detectado${items.length === 1 ? "" : "s"}. Revisalos antes de crear el proyecto.`
        });
      }
    } catch (error) {
      toast("No se pudo leer el PDF", {
        description: error instanceof Error ? error.message : "El archivo no contiene texto legible."
      });
    } finally {
      setProcesando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const actualizarItem = <K extends keyof ItemPresupuesto>(id: string, campo: K, contenido: ItemPresupuesto[K]) => {
    if (!valor) return;
    alCambiar({
      ...valor,
      items: valor.items.map((item) => (item.id === id ? { ...item, [campo]: contenido } : item))
    });
  };

  const eliminarItem = (id: string) => {
    if (!valor) return;
    alCambiar({ ...valor, items: valor.items.filter((item) => item.id !== id) });
  };

  const agregarItem = () => {
    if (!valor) return;
    alCambiar({ ...valor, items: [...valor.items, nuevoItem(tiposSeleccionados)] });
  };

  const totalUnidades = valor?.items.reduce((total, item) => total + Math.max(0, item.cantidad), 0) ?? 0;
  const tiposAsignables = tiposSeleccionados.length > 0 ? tiposSeleccionados : (["servicios"] as TipoProducto[]);

  return (
    <section className="space-y-4 rounded-2xl border border-primary/25 bg-primary/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="senal">Fuente del seguimiento</div>
          <h3 className="mt-1 font-heading text-lg font-semibold">Presupuesto ejecutivo *</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Subí la última versión en PDF. La lectura se realiza en este navegador y siempre requiere una revisión manual antes de generar las tareas.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-1.5 sm:w-auto">
          <Label htmlFor={inputId}>{valor ? "Reemplazar PDF" : "Seleccionar PDF"}</Label>
          <Input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="application/pdf,.pdf"
            disabled={procesando}
            onChange={(evento) => void cargar(evento.target.files?.[0])}
          />
          {procesando && <p className="flex items-center gap-1.5 text-xs text-primary"><LoaderCircle className="size-3.5 animate-spin" /> Leyendo PDF…</p>}
        </div>
      </div>

      {!valor ? (
        <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed bg-background/60 px-4 text-center text-sm text-muted-foreground">
          El presupuesto ejecutivo es obligatorio para crear el proyecto.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background/70 p-3 text-sm">
            <FileCheck2 className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{valor.nombreArchivo}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {FORMATOS[valor.formato]}{valor.numero ? ` · Nº ${valor.numero}` : ""}{valor.fecha ? ` · ${valor.fecha}` : ""}
              </div>
            </div>
            <div className="cifra text-xs text-muted-foreground">
              {valor.items.length} componentes · {totalUnidades} unidades
            </div>
          </div>

          {valor.formato === "desconocido" && (
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              El formato no fue reconocido. Agregá los componentes manualmente o reemplazá el archivo.
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border bg-background">
            <Table className="min-w-[1320px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Posición</TableHead>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead className="w-44">Producto</TableHead>
                  <TableHead className="w-40">Ambiente</TableHead>
                  <TableHead className="min-w-56">Descripción</TableHead>
                  <TableHead className="w-24">Cant.</TableHead>
                  <TableHead className="w-28">Ancho</TableHead>
                  <TableHead className="w-28">Alto</TableHead>
                  <TableHead className="w-40">Serie</TableHead>
                  <TableHead className="w-36">Color</TableHead>
                  <TableHead className="w-48">Vidrio / detalle</TableHead>
                  <TableHead className="w-12"><span className="sr-only">Eliminar</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valor.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell><Input value={item.posicion} onChange={(e) => actualizarItem(item.id, "posicion", e.target.value)} aria-label={`Posición ${item.codigo}`} /></TableCell>
                    <TableCell><Input value={item.codigo} onChange={(e) => actualizarItem(item.id, "codigo", e.target.value)} aria-label={`Código de posición ${item.posicion}`} /></TableCell>
                    <TableCell>
                      <select
                        value={item.tipoProducto}
                        onChange={(e) => actualizarItem(item.id, "tipoProducto", e.target.value as TipoProducto)}
                        className="h-9 w-full rounded-md border bg-transparent px-2 text-xs"
                        aria-label={`Producto de ${item.codigo || item.posicion}`}
                      >
                        {tiposAsignables.map((tipo) => <option key={tipo} value={tipo}>{nombreTipoProducto(tipo)}</option>)}
                      </select>
                    </TableCell>
                    <TableCell><Input value={item.ambiente} onChange={(e) => actualizarItem(item.id, "ambiente", e.target.value)} aria-label={`Ambiente de ${item.codigo}`} /></TableCell>
                    <TableCell><Input value={item.descripcion} onChange={(e) => actualizarItem(item.id, "descripcion", e.target.value)} aria-label={`Descripción de ${item.codigo}`} /></TableCell>
                    <TableCell><Input type="number" min={1} value={item.cantidad} onChange={(e) => actualizarItem(item.id, "cantidad", Number(e.target.value))} aria-label={`Cantidad de ${item.codigo}`} /></TableCell>
                    <TableCell><Input type="number" min={0} value={item.ancho} onChange={(e) => actualizarItem(item.id, "ancho", Number(e.target.value))} aria-label={`Ancho de ${item.codigo}`} /></TableCell>
                    <TableCell><Input type="number" min={0} value={item.alto} onChange={(e) => actualizarItem(item.id, "alto", Number(e.target.value))} aria-label={`Alto de ${item.codigo}`} /></TableCell>
                    <TableCell><Input value={item.serie} onChange={(e) => actualizarItem(item.id, "serie", e.target.value)} aria-label={`Serie de ${item.codigo}`} /></TableCell>
                    <TableCell><Input value={item.color} onChange={(e) => actualizarItem(item.id, "color", e.target.value)} aria-label={`Color de ${item.codigo}`} /></TableCell>
                    <TableCell><Input value={item.vidrio} onChange={(e) => actualizarItem(item.id, "vidrio", e.target.value)} aria-label={`Vidrio o detalle de ${item.codigo}`} /></TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => eliminarItem(item.id)} aria-label={`Eliminar ${item.codigo || item.posicion}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Corregí, reasigná, agregá o eliminá filas antes de confirmar.</p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={agregarItem}>
              <Plus className="size-3.5" /> Agregar componente
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
