import { useState } from "react";
import { Link } from "react-router";
import { Check, Plus, MapPin, Factory, HardHat } from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import {
  clientes, usuarios, clientePorId, usuarioPorId, avanceGeneral, etapas,
  ETAPAS_FABRICA, ETAPAS_FABRICA_OPCIONALES, ETAPAS_OBRA, obtenerProyectos,
  guardarProyectos, type EstadoObra, type Proyecto
} from "@/mocks/data";
import { formatFecha } from "@/lib/format";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { EstadoBadge } from "@/components/app/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const FILTROS: { valor: EstadoObra | "todas"; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "en_progreso", label: "En progreso" },
  { valor: "pausada", label: "Pausadas" },
  { valor: "planificada", label: "Planificadas" },
  { valor: "finalizada", label: "Finalizadas" }
];

export default function Proyectos() {
  const { user } = useAuth();
  const hoy = new Date().toISOString().slice(0, 10);
  const etapasFabricaIniciales = [...ETAPAS_FABRICA];
  const [filtro, setFiltro] = useState<EstadoObra | "todas">("todas");
  const [listaProyectos, setListaProyectos] = useState<Proyecto[]>(() => obtenerProyectos());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [liderId, setLiderId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [etapasFabricaSeleccionadas, setEtapasFabricaSeleccionadas] = useState<string[]>(etapasFabricaIniciales);
  const [etapasObraSeleccionadas, setEtapasObraSeleccionadas] = useState<string[]>(ETAPAS_OBRA);
  if (!user) return null;

  const visibles = listaProyectos.filter((p) => filtro === "todas" || p.estado === filtro);
  const responsables = usuarios.filter((u) => u.isActive && (u.role === "administrator" || u.role === "supervisor"));

  const alternarEtapa = (grupo: "fabrica" | "obra", nombreEtapa: string) => {
    const setter = grupo === "fabrica" ? setEtapasFabricaSeleccionadas : setEtapasObraSeleccionadas;
    setter((prev) => prev.includes(nombreEtapa) ? prev.filter((e) => e !== nombreEtapa) : [...prev, nombreEtapa]);
  };

  const reiniciarFormulario = () => {
    setNombre("");
    setClienteId("");
    setUbicacion("");
    setLiderId("");
    setFechaInicio("");
    setEtapasFabricaSeleccionadas(etapasFabricaIniciales);
    setEtapasObraSeleccionadas(ETAPAS_OBRA);
  };

  const crearProyecto = () => {
    const nombreLimpio = nombre.trim();
    const ubicacionLimpia = ubicacion.trim();

    if (!nombreLimpio || !clienteId || !fechaInicio) {
      toast("Faltan datos", { description: "Nombre, cliente y fecha de inicio son obligatorios." });
      return;
    }
    if (etapasFabricaSeleccionadas.length === 0 && etapasObraSeleccionadas.length === 0) {
      toast("Seleccioná etapas", { description: "El proyecto necesita al menos una etapa de fábrica u obra." });
      return;
    }

    const nuevo: Proyecto = {
      id: `p-${Date.now()}`,
      nombre: nombreLimpio,
      clienteId,
      ubicacion: ubicacionLimpia || "Sin ubicación",
      liderId,
      estado: "planificada",
      fechaCreacion: hoy,
      fechaInicio,
      fechaFinEstimada: "",
      avanceFabrica: 0,
      avanceObra: 0,
      etapasFabrica: etapas(etapasFabricaSeleccionadas, []),
      etapasObra: etapas(etapasObraSeleccionadas, []),
      aberturas: [],
      cronograma: [
        ...etapasFabricaSeleccionadas.map((etapa) => ({ etapa, inicio: fechaInicio, fin: fechaInicio })),
        ...etapasObraSeleccionadas.map((etapa) => ({ etapa, inicio: fechaInicio, fin: fechaInicio }))
      ],
      documentos: [],
      descripcion: "Proyecto creado manualmente. Pendiente cargar oferta, ábaco y descripción operativa."
    };

    const actualizada = [nuevo, ...listaProyectos];
    setListaProyectos(actualizada);
    guardarProyectos(actualizada);
    setModalAbierto(false);
    reiniciarFormulario();
    toast("Proyecto creado", { description: nuevo.nombre });
  };

  const CheckEtapa = ({ grupo, nombreEtapa }: { grupo: "fabrica" | "obra"; nombreEtapa: string }) => {
    const seleccionadas = grupo === "fabrica" ? etapasFabricaSeleccionadas : etapasObraSeleccionadas;
    const activo = seleccionadas.includes(nombreEtapa);

    return (
      <button
        type="button"
        onClick={() => alternarEtapa(grupo, nombreEtapa)}
        aria-pressed={activo}
        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          activo ? "border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span>{nombreEtapa}</span>
        <span className={`grid size-5 place-items-center rounded border ${activo ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
          {activo && <Check className="size-3.5" />}
        </span>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Obras</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Proyectos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={(v) => setFiltro(v as EstadoObra | "todas")}>
            <SelectTrigger className="w-40" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTROS.map((f) => (
                <SelectItem key={f.valor} value={f.valor}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {permisos.crearProyecto(user.role) && (
            <Button className="gap-2" onClick={() => setModalAbierto(true)}>
              <Plus className="size-4" /> Nuevo proyecto
            </Button>
          )}
        </div>
      </header>

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
            <DialogDescription>
              Cargá los datos base y elegí qué etapas aplican antes de crear el proyecto.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[72vh] gap-5 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nombre-proyecto">Nombre del proyecto *</Label>
                <Input id="nombre-proyecto" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Proyecto 2680/26" />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.filter((c) => c.estado === "activo").map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Líder</Label>
                <Select value={liderId} onValueChange={setLiderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsables.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ubicacion-proyecto">Ubicación</Label>
                <Input id="ubicacion-proyecto" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ciudad, obra o dirección" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha-inicio-proyecto">Fecha de inicio *</Label>
                <Input id="fecha-inicio-proyecto" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <section className="space-y-2">
                <div>
                  <h3 className="font-heading text-sm font-semibold">Etapas de fábrica</h3>
                  <p className="text-xs text-muted-foreground">Todas vienen tildadas por defecto, salvo etapas opcionales.</p>
                </div>
                <div className="grid gap-2">
                  {[...ETAPAS_FABRICA, ...ETAPAS_FABRICA_OPCIONALES].map((etapaNombre) => (
                    <CheckEtapa key={etapaNombre} grupo="fabrica" nombreEtapa={etapaNombre} />
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div>
                  <h3 className="font-heading text-sm font-semibold">Etapas de obra</h3>
                  <p className="text-xs text-muted-foreground">Las etapas no seleccionadas no aparecerán en seguimiento.</p>
                </div>
                <div className="grid gap-2">
                  {ETAPAS_OBRA.map((etapaNombre) => (
                    <CheckEtapa key={etapaNombre} grupo="obra" nombreEtapa={etapaNombre} />
                  ))}
                </div>
              </section>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={crearProyecto}>Crear proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="grid gap-4 md:grid-cols-2">
        {visibles.map((p) => {
          const lider = usuarioPorId(p.liderId);
          return (
            <Link key={p.id} to={`/proyectos/${p.id}`} className="group">
              <Card className="h-full gap-4 py-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                <CardContent className="space-y-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-heading text-lg font-bold tracking-tight group-hover:text-primary">
                        {p.nombre}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{p.ubicacion}</span>
                      </div>
                    </div>
                    <EstadoBadge estado={p.estado} className="shrink-0" />
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Factory className="size-3" /> Fábrica</span>
                      </div>
                      <AvanceMeter valor={p.avanceFabrica} etapas={p.etapasFabrica.length} size="sm" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><HardHat className="size-3" /> Obra</span>
                      </div>
                      <AvanceMeter valor={p.avanceObra} etapas={p.etapasObra.length} size="sm" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="truncate">{clientePorId(p.clienteId)?.nombre}</span>
                    <span className="cifra shrink-0">{avanceGeneral(p)}% · {formatFecha(p.fechaFinEstimada)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Líder: <span className="font-medium text-foreground">{lider?.displayName ?? "Sin asignar"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {visibles.length === 0 && (
        <Card className="py-14">
          <CardContent className="text-center text-sm text-muted-foreground">
            No hay proyectos con este estado. Cambiá el filtro para ver el resto.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
