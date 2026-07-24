import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowLeftRight, ArrowUp, CalendarClock, ChevronDown, Clock, Flag,
  Gauge, HelpCircle, Lock, Plus, RotateCcw, Save, Trash2
} from "lucide-react";
import {
  guardarReglasPlanificacion,
  obtenerReglasPlanificacion,
  puedeEliminarRegla,
  reglasPredeterminadas,
  validarReglas,
  type ReglaPlanificacion,
  type TipoRegla
} from "@/lib/planificacion";
import {
  guardarTopesCapacidad,
  obtenerTopesCapacidad,
  TOPE_FABRICA_PREDETERMINADO,
  TOPE_INSTALACION_PREDETERMINADO
} from "@/lib/capacidad";
import { nombreTipoProducto, obtenerCatalogoActivo } from "@/mocks/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TIPO_META: Record<TipoRegla, { label: string; icono: typeof Flag; cls: string }> = {
  hito: { label: "Hito", icono: Flag, cls: "bg-primary/10 text-primary" },
  bloque: { label: "Bloque", icono: Clock, cls: "bg-estado-progreso/12 text-estado-progreso" },
  brecha: { label: "Brecha", icono: ArrowLeftRight, cls: "bg-estado-pausada/14 text-estado-pausada" }
};

const TIPO_AYUDA: Record<TipoRegla, { resumen: string; badge: string; ejemplo: string }> = {
  hito: { resumen: "Ponés una fecha fija y el sistema calcula los días.", badge: "fecha → días", ejemplo: "Confirmación del cliente." },
  bloque: { resumen: "Ponés los días de trabajo y el sistema calcula las fechas.", badge: "días → fechas", ejemplo: "Fabricación, instalación." },
  brecha: { resumen: "Ponés los días de separación entre dos hitos.", badge: "días vacíos", ejemplo: "Fin de producción → inicio de instalación." }
};

function AyudaTipos() {
  return (
    <div className="space-y-2">
      {(Object.keys(TIPO_META) as TipoRegla[]).map((tipo) => {
        const meta = TIPO_META[tipo];
        const ayuda = TIPO_AYUDA[tipo];
        const Icono = meta.icono;
        return (
          <div key={tipo} className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5">
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-md", meta.cls)}>
              <Icono className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-medium">{meta.label}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", meta.cls)}>{ayuda.badge}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ayuda.resumen} <span className="text-muted-foreground/70">Ej.: {ayuda.ejemplo}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChipToggle({
  activo, disabled, onClick, children
}: { activo: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        activo ? "border-primary/30 bg-primary/10 text-primary" : "border-input text-muted-foreground hover:text-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {children}
    </button>
  );
}

function SeccionReglas() {
  const [reglas, setReglas] = useState<ReglaPlanificacion[]>(() =>
    [...obtenerReglasPlanificacion()].sort((a, b) => a.orden - b.orden)
  );
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);
  const [tipo, setTipo] = useState<TipoRegla>("brecha");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [dias, setDias] = useState("");
  const [obligatoria, setObligatoria] = useState(true);
  const [porDefecto, setPorDefecto] = useState(true);

  const alertas = useMemo(() => validarReglas(reglas), [reglas]);
  const errores = alertas.filter((a) => a.nivel === "error");
  const avisos = alertas.filter((a) => a.nivel === "aviso");

  const actualizar = (id: string, cambios: Partial<ReglaPlanificacion>) =>
    setReglas((prev) => prev.map((r) => (r.id === id ? { ...r, ...cambios } : r)));

  const reindex = (lista: ReglaPlanificacion[]) => lista.map((r, indice) => ({ ...r, orden: indice }));

  const mover = (id: string, direccion: -1 | 1) =>
    setReglas((prev) => {
      const orden = [...prev].sort((a, b) => a.orden - b.orden);
      const i = orden.findIndex((r) => r.id === id);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= orden.length) return prev;
      [orden[i], orden[j]] = [orden[j], orden[i]];
      return reindex(orden);
    });

  const eliminar = (regla: ReglaPlanificacion) => {
    if (!puedeEliminarRegla(regla)) {
      toast("Regla protegida", { description: `"${regla.nombre}" es parte del mínimo obligatorio y no puede eliminarse.` });
      return;
    }
    setReglas((prev) => reindex(prev.filter((r) => r.id !== regla.id)));
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setTipo("brecha");
    setNombre("");
    setDescripcion("");
    setDias("");
    setObligatoria(true);
    setPorDefecto(true);
  };

  const agregar = () => {
    const limpio = nombre.trim();
    if (!limpio) {
      toast("Falta el nombre", { description: "La regla necesita un nombre." });
      return;
    }
    if (tipo === "brecha") {
      const numero = Number(dias);
      if (!Number.isInteger(numero) || numero < 0) {
        toast("Revisá los días", { description: "La brecha necesita un número entero (0 o más)." });
        return;
      }
    }
    const maxOrden = reglas.reduce((maximo, r) => Math.max(maximo, r.orden), -1);
    const nueva: ReglaPlanificacion = {
      id: `regla-custom-${Date.now()}`,
      tipo,
      nombre: limpio,
      descripcion: descripcion.trim() || undefined,
      obligatoria,
      porDefecto,
      protegida: false,
      orden: maxOrden + 1,
      dias: tipo === "brecha" ? Number(dias) : undefined
    };
    setReglas((prev) => [...prev, nueva]);
    cerrarModal();
    toast("Regla agregada", { description: `"${limpio}" se aplicará a los proyectos nuevos. No olvides guardar.` });
  };

  const guardar = () => {
    const problemas = validarReglas(reglas).filter((a) => a.nivel === "error");
    if (problemas.length) {
      toast("No se puede guardar", { description: problemas[0].mensaje });
      return;
    }
    guardarReglasPlanificacion(reglas);
    toast("Reglas guardadas", { description: "Se aplicarán a las próximas estimaciones de fecha y a los proyectos nuevos." });
  };

  const restaurar = () => setReglas(reglasPredeterminadas());

  const orden = [...reglas].sort((a, b) => a.orden - b.orden);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <CardTitle>Reglas de planificación backward</CardTitle>
            <CardDescription>
              Hitos, bloques de trabajo y brechas entre hitos que ordenan el cálculo de fechas desde el inicio comprometido de instalación.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <div className="overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.04]">
          <button
            type="button"
            onClick={() => setAyudaAbierta((valor) => !valor)}
            aria-expanded={ayudaAbierta}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-primary"
          >
            <HelpCircle className="size-4 shrink-0" />
            <span className="flex-1">¿Qué significa cada tipo de regla?</span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform", ayudaAbierta && "rotate-180")} />
          </button>
          {ayudaAbierta && (
            <div className="border-t border-primary/15 p-3">
              <AyudaTipos />
            </div>
          )}
        </div>

        {(errores.length > 0 || avisos.length > 0) && (
          <div className="space-y-2">
            {errores.map((a, i) => (
              <div key={`e-${i}`} className="flex items-start gap-2 rounded-lg border border-estado-riesgo/30 bg-estado-riesgo/8 p-2.5 text-xs text-estado-riesgo">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a.mensaje}
              </div>
            ))}
            {avisos.map((a, i) => (
              <div key={`a-${i}`} className="flex items-start gap-2 rounded-lg border border-estado-pausada/30 bg-estado-pausada/8 p-2.5 text-xs text-estado-pausada">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a.mensaje}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {orden.map((r, indice) => {
            const meta = TIPO_META[r.tipo];
            const Icono = meta.icono;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex flex-col text-muted-foreground">
                  <button
                    type="button"
                    className="grid size-5 place-items-center rounded hover:text-foreground disabled:opacity-30"
                    disabled={indice === 0}
                    onClick={() => mover(r.id, -1)}
                    aria-label={`Subir ${r.nombre}`}
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="grid size-5 place-items-center rounded hover:text-foreground disabled:opacity-30"
                    disabled={indice === orden.length - 1}
                    onClick={() => mover(r.id, 1)}
                    aria-label={`Bajar ${r.nombre}`}
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>

                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", meta.cls)} title={`${meta.label} — ${TIPO_AYUDA[r.tipo].resumen}`}>
                  <Icono className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{r.nombre}</span>
                    {r.protegida && <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Mínimo obligatorio" />}
                  </div>
                  {r.descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{r.descripcion}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <ChipToggle activo={r.obligatoria} disabled={r.protegida} onClick={() => actualizar(r.id, { obligatoria: !r.obligatoria })}>
                      Obligatoria
                    </ChipToggle>
                    <ChipToggle activo={r.porDefecto} onClick={() => actualizar(r.id, { porDefecto: !r.porDefecto })}>
                      Preseleccionada
                    </ChipToggle>
                  </div>
                </div>

                {r.tipo === "brecha" ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={String(r.dias ?? 0)}
                      onChange={(evento) => {
                        const numero = Math.trunc(Number(evento.target.value));
                        actualizar(r.id, { dias: Number.isFinite(numero) && numero >= 0 ? numero : 0 });
                      }}
                      className="w-20 text-right"
                      aria-label={`Días de ${r.nombre}`}
                    />
                    <span className="text-xs text-muted-foreground">días</span>
                  </div>
                ) : (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {r.tipo === "bloque" ? "días por proyecto" : "fecha por proyecto"}
                  </span>
                )}

                {puedeEliminarRegla(r) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => eliminar(r)}
                    aria-label={`Eliminar ${r.nombre}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : (
                  <span className="grid size-9 shrink-0 place-items-center text-muted-foreground" title="Regla protegida">
                    <Lock className="size-4" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="gap-1.5" onClick={() => setModalAbierto(true)}>
            <Plus className="size-4" /> Agregar regla
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-2" onClick={restaurar}>
              <RotateCcw className="size-4" /> Restaurar
            </Button>
            <Button className="gap-2" onClick={guardar} disabled={errores.length > 0}>
              <Save className="size-4" /> Guardar reglas
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Las reglas con candado son el mínimo obligatorio: se pueden ajustar pero no eliminar, porque sin ellas la planificación
          backward no puede calcularse. Los cambios aplican solo a proyectos nuevos; los existentes conservan sus fechas.
        </p>
      </CardContent>

      <Dialog open={modalAbierto} onOpenChange={(abierto) => (abierto ? setModalAbierto(true) : cerrarModal())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar regla</DialogTitle>
            <DialogDescription>
              Definí un hito, un bloque de trabajo o una brecha entre hitos. Se aplica a los proyectos nuevos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(valor) => setTipo(valor as TipoRegla)}>
                <SelectTrigger className="w-full" aria-label="Tipo de regla">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hito">Hito — la fecha se define por proyecto</SelectItem>
                  <SelectItem value="bloque">Bloque — los días de trabajo se definen por proyecto</SelectItem>
                  <SelectItem value="brecha">Brecha — días entre dos hitos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-2.5">
                {(() => {
                  const meta = TIPO_META[tipo];
                  const Icono = meta.icono;
                  return (
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-md", meta.cls)}>
                      <Icono className="size-3.5" />
                    </span>
                  );
                })()}
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{TIPO_META[tipo].label}:</span> {TIPO_AYUDA[tipo].resumen}{" "}
                  <span className="text-muted-foreground/70">Ej.: {TIPO_AYUDA[tipo].ejemplo}</span>
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="regla-nombre">Nombre</Label>
              <Input id="regla-nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} placeholder="Ej.: Inspección de calidad" />
            </div>
            {tipo === "brecha" && (
              <div className="space-y-1.5">
                <Label htmlFor="regla-dias">Días de separación</Label>
                <Input id="regla-dias" type="number" min={0} step={1} value={dias} onChange={(evento) => setDias(evento.target.value)} className="w-28" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="regla-desc">Descripción</Label>
              <Textarea id="regla-desc" rows={2} value={descripcion} onChange={(evento) => setDescripcion(evento.target.value)} placeholder="Para qué sirve este hito o regla, para contextualizar al equipo" />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Switch id="regla-oblig" checked={obligatoria} onCheckedChange={setObligatoria} />
                <Label htmlFor="regla-oblig" className="text-sm">Obligatoria para todos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="regla-def" checked={porDefecto} onCheckedChange={setPorDefecto} />
                <Label htmlFor="regla-def" className="text-sm">Preseleccionada</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrarModal}>Cancelar</Button>
            <Button onClick={agregar}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SeccionCapacidad() {
  const productos = obtenerCatalogoActivo().filter((producto) => producto.valor !== "servicios");
  const [fabrica, setFabrica] = useState<Record<string, string>>(() => {
    const topes = obtenerTopesCapacidad();
    const inicial: Record<string, string> = {};
    for (const producto of productos) {
      const valor = topes.fabrica[String(producto.valor)];
      inicial[String(producto.valor)] = valor ? String(valor) : "";
    }
    return inicial;
  });
  const [instalacion, setInstalacion] = useState(() => String(obtenerTopesCapacidad().instalacion));

  const guardar = () => {
    const fab: Record<string, number> = {};
    for (const producto of productos) {
      const bruto = fabrica[String(producto.valor)]?.trim();
      if (!bruto) continue;
      const numero = Number(bruto);
      if (!Number.isInteger(numero) || numero <= 0) {
        toast("Revisá la capacidad", { description: `El tope de fábrica de "${producto.label}" necesita un número entero mayor a 0.` });
        return;
      }
      fab[String(producto.valor)] = numero;
    }
    const inst = Number(instalacion);
    if (!Number.isInteger(inst) || inst <= 0) {
      toast("Revisá la capacidad", { description: "El tope de instalación necesita un número entero mayor a 0." });
      return;
    }
    guardarTopesCapacidad({ fabrica: fab, instalacion: inst });
    toast("Capacidad guardada", { description: "El cronograma general marcará las semanas que superen estos topes." });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Gauge className="size-5" />
          </div>
          <div>
            <CardTitle>Capacidad de producción</CardTitle>
            <CardDescription>
              Aberturas por día que la operación puede sostener. El cronograma general resalta cuándo la demanda supera el tope.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <div>
          <h4 className="font-heading text-sm font-semibold">Fábrica — por línea de producto</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">Cada línea (PVC, aluminio, etc.) tiene su propia capacidad diaria.</p>
          <div className="mt-3 space-y-2">
            {productos.map((producto) => (
              <div key={producto.valor} className="flex items-center gap-3 rounded-xl border p-3">
                <Label htmlFor={`cap-fab-${producto.valor}`} className="flex-1 text-sm font-medium">
                  {producto.label}
                </Label>
                <Input
                  id={`cap-fab-${producto.valor}`}
                  type="number"
                  min={1}
                  step={1}
                  value={fabrica[String(producto.valor)] ?? ""}
                  onChange={(evento) => setFabrica((previos) => ({ ...previos, [String(producto.valor)]: evento.target.value }))}
                  placeholder={`Predet. ${TOPE_FABRICA_PREDETERMINADO}`}
                  className="w-28 text-right"
                />
                <span className="w-16 text-sm text-muted-foreground">ab./día</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="flex-1">
            <Label htmlFor="cap-instalacion" className="text-sm font-semibold">Instalación (cuadrillas)</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Tope único, sin distinguir producto.</p>
          </div>
          <Input
            id="cap-instalacion"
            type="number"
            min={1}
            step={1}
            value={instalacion}
            onChange={(evento) => setInstalacion(evento.target.value)}
            placeholder={`Predet. ${TOPE_INSTALACION_PREDETERMINADO}`}
            className="w-28 text-right"
          />
          <span className="w-16 text-sm text-muted-foreground">ab./día</span>
        </div>

        <div className="flex justify-end">
          <Button className="gap-2" onClick={guardar}>
            <Save className="size-4" /> Guardar capacidad
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          La demanda se calcula repartiendo el total de aberturas de cada producto entre los días de su etapa
          ({nombreTipoProducto("aberturas_pvc")}, aluminio, etc.). Los topes vacíos usan el valor predeterminado.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Reglas() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Administración</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Reglas de planificación</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas de negocio editables: hitos, bloques y brechas del cálculo backward de fechas, y capacidad de producción.
        </p>
      </header>

      <SeccionReglas />
      <SeccionCapacidad />
    </div>
  );
}
