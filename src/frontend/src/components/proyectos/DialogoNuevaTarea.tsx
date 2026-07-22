// Panel de "Nueva tarea" con selección en cascada:
// cliente → proyecto → producto → etapa (bloque) → detalles de la tarea.
// Cada paso se habilita solo cuando el anterior está elegido.
import { useMemo, useState } from "react";
import { ArrowRight, Building2, Layers, Users } from "lucide-react";
import { toast } from "sonner";
import { ETIQUETAS_GRUPO, gruposDeProducto } from "@/lib/seguimiento-presupuesto";
import {
  clientes, nombreTipoProducto, PRIORIDADES_TAREA,
  type GrupoTareaPresupuesto, type PrioridadTarea, type Proyecto, type TareaPresupuesto, type TipoProducto
} from "@/mocks/data";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  abierto: boolean;
  proyectos: Proyecto[];
  alCerrar: () => void;
  alAgregar: (proyectoId: string, tarea: TareaPresupuesto) => void;
}

function PasoEncabezado({ numero, activo, completado, icono: Icono, titulo }: {
  numero: number;
  activo: boolean;
  completado: boolean;
  icono: typeof Users;
  titulo: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors ${
          completado ? "bg-primary text-primary-foreground" : activo ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {numero}
      </span>
      <Label className={`flex items-center gap-1.5 ${activo || completado ? "" : "text-muted-foreground"}`}>
        <Icono className="size-3.5" /> {titulo}
      </Label>
    </div>
  );
}

export function DialogoNuevaTarea({ abierto, proyectos, alCerrar, alAgregar }: Props) {
  const [clienteId, setClienteId] = useState("");
  const [proyectoId, setProyectoId] = useState("");
  const [productoTipo, setProductoTipo] = useState<TipoProducto | "">("");
  const [grupo, setGrupo] = useState<GrupoTareaPresupuesto | "">("");
  const [titulo, setTitulo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadTarea>("media");

  // Solo proyectos con seguimiento ya generado admiten tareas nuevas.
  const proyectosConSeguimiento = useMemo(
    () => proyectos.filter((p) => (p.tareasPresupuesto?.length ?? 0) > 0),
    [proyectos]
  );

  // Paso 1: clientes que tienen al menos un proyecto con seguimiento.
  const clientesDisponibles = useMemo(() => {
    const ids = new Set(proyectosConSeguimiento.map((p) => p.clienteId));
    return clientes.filter((c) => ids.has(c.id));
  }, [proyectosConSeguimiento]);

  // Paso 2: proyectos del cliente elegido.
  const proyectosDelCliente = useMemo(
    () => proyectosConSeguimiento.filter((p) => p.clienteId === clienteId),
    [proyectosConSeguimiento, clienteId]
  );
  const proyecto = proyectosDelCliente.find((p) => p.id === proyectoId);

  // Paso 3: productos del proyecto (excepto servicios).
  const productos = useMemo(
    () => proyecto?.productos?.filter((p) => p.tipo !== "servicios") ?? [],
    [proyecto]
  );
  const producto = productos.find((p) => p.tipo === productoTipo);

  // Paso 4: etapas (bloques) que existen para ese producto.
  const bloques = useMemo(
    () => (producto ? gruposDeProducto(producto).filter((b) => b.etapas.length > 0) : []),
    [producto]
  );

  const reiniciar = () => {
    setClienteId(""); setProyectoId(""); setProductoTipo(""); setGrupo("");
    setTitulo(""); setFechaInicio(""); setFechaFin(""); setPrioridad("media");
  };

  const cerrar = (valor: boolean) => {
    if (!valor) { alCerrar(); reiniciar(); }
  };

  const listo = Boolean(clienteId && proyectoId && productoTipo && grupo && titulo.trim());

  const guardar = () => {
    if (!listo || !proyecto || !productoTipo || !grupo) return;
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      toast("Revisá las fechas", { description: "La fecha de entrega no puede ser anterior al inicio." });
      return;
    }
    alAgregar(proyecto.id, {
      id: `manual-${Date.now()}`,
      itemId: "",
      tipoProducto: productoTipo,
      grupo,
      etapa: "Tarea agregada",
      titulo: titulo.trim(),
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      manual: true,
      prioridad,
      creadaEn: new Date().toISOString(),
      version: 1,
      completada: false
    });
    toast("Tarea agregada", { description: `${titulo.trim()} · ${proyecto.nombre}` });
    alCerrar();
    reiniciar();
  };

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva tarea de seguimiento</DialogTitle>
          <DialogDescription>
            Elegí el cliente, su proyecto y la etapa donde hace falta la tarea.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Paso 1: Cliente */}
          <div className="space-y-1.5">
            <PasoEncabezado numero={1} activo icono={Users} titulo="Cliente" completado={Boolean(clienteId)} />
            <Select
              value={clienteId}
              onValueChange={(valor) => { setClienteId(valor); setProyectoId(""); setProductoTipo(""); setGrupo(""); }}
            >
              <SelectTrigger className="w-full" aria-label="Cliente">
                <SelectValue placeholder="Seleccioná un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientesDisponibles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 2: Proyecto */}
          <div className="space-y-1.5">
            <PasoEncabezado numero={2} activo={Boolean(clienteId)} icono={Building2} titulo="Proyecto" completado={Boolean(proyectoId)} />
            <Select
              value={proyectoId}
              disabled={!clienteId}
              onValueChange={(valor) => { setProyectoId(valor); setProductoTipo(""); setGrupo(""); }}
            >
              <SelectTrigger className="w-full" aria-label="Proyecto">
                <SelectValue placeholder={clienteId ? "Seleccioná un proyecto" : "Elegí primero un cliente"} />
              </SelectTrigger>
              <SelectContent>
                {proyectosDelCliente.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 3: Producto */}
          <div className="space-y-1.5">
            <PasoEncabezado numero={3} activo={Boolean(proyectoId)} icono={Layers} titulo="Producto" completado={Boolean(productoTipo)} />
            <Select
              value={productoTipo}
              disabled={!proyectoId}
              onValueChange={(valor) => { setProductoTipo(valor as TipoProducto); setGrupo(""); }}
            >
              <SelectTrigger className="w-full" aria-label="Producto">
                <SelectValue placeholder={proyectoId ? "Seleccioná un producto" : "Elegí primero un proyecto"} />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.tipo} value={p.tipo}>{nombreTipoProducto(p.tipo)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 4: Etapa (bloque) */}
          <div className="space-y-1.5">
            <PasoEncabezado numero={4} activo={Boolean(productoTipo)} icono={Layers} titulo="Etapa" completado={Boolean(grupo)} />
            <Select
              value={grupo}
              disabled={!productoTipo}
              onValueChange={(valor) => setGrupo(valor as GrupoTareaPresupuesto)}
            >
              <SelectTrigger className="w-full" aria-label="Etapa">
                <SelectValue placeholder={productoTipo ? "Seleccioná una etapa" : "Elegí primero un producto"} />
              </SelectTrigger>
              <SelectContent>
                {bloques.map((b) => (
                  <SelectItem key={b.grupo} value={b.grupo}>{ETIQUETAS_GRUPO[b.grupo]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paso 5: Detalles de la tarea */}
          {grupo && (
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="nueva-tarea-titulo">Nombre de la tarea *</Label>
                <Input
                  id="nueva-tarea-titulo"
                  value={titulo}
                  onChange={(evento) => setTitulo(evento.target.value)}
                  placeholder="Ej. Verificar plomo de premarcos piso 3"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={prioridad} onValueChange={(valor) => setPrioridad(valor as PrioridadTarea)}>
                  <SelectTrigger className="w-full" aria-label="Prioridad de la tarea">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES_TAREA.map((p) => (
                      <SelectItem key={p} value={p}><span className="capitalize">{p}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nueva-tarea-inicio">Fecha de inicio</Label>
                  <Input id="nueva-tarea-inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nueva-tarea-fin">Fecha de entrega</Label>
                  <Input id="nueva-tarea-fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => cerrar(false)}>Cancelar</Button>
          <Button className="gap-1.5" onClick={guardar} disabled={!listo}>
            Agregar tarea <ArrowRight className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
