import { useState } from "react";
import { Link } from "react-router";
import { Check, Columns3, Factory, Hammer, HardHat, LayoutGrid, MapPin, Plus, Ruler, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import {
  clientes, usuarios, clientePorId, usuarioPorId, avanceGeneral, avanceGrupo, etapas,
  ETAPAS_FABRICA, ETAPAS_FABRICA_OPCIONALES, ETAPAS_OBRA,
  ETAPAS_FABRICACION_PREMARCOS, ETAPAS_INSTALACION_PREMARCOS,
  TIPOS_PRODUCTO, nombreTipoProducto, obtenerProyectos, guardarProyectos, guardarProyecto,
  type ConfiguracionProductoProyecto, type EstadoObra, type PresupuestoEjecutivo, type Proyecto, type TipoProducto
} from "@/mocks/data";
import { generarTareasDesdePresupuesto } from "@/lib/seguimiento-presupuesto";
import { formatFecha } from "@/lib/format";
import { AvanceMeter } from "@/components/app/AvanceMeter";
import { EstadoBadge } from "@/components/app/EstadoBadge";
import { PresupuestoUploader } from "@/components/proyectos/PresupuestoUploader";
import { TableroProyectos } from "@/components/proyectos/TableroProyectos";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const FILTROS: { valor: EstadoObra | "todas"; label: string }[] = [
  { valor: "todas", label: "Todas" },
  { valor: "en_progreso", label: "En progreso" },
  { valor: "pausada", label: "Pausadas" },
  { valor: "planificada", label: "Planificadas" },
  { valor: "finalizada", label: "Finalizadas" },
  { valor: "cancelada", label: "Canceladas" }
];

interface EtapaConfigurable {
  id: string;
  nombre: string;
  seleccionada: boolean;
}

interface ConfiguracionProductoFormulario {
  fabricaraPremarcos: boolean;
  instalaraPremarcos: boolean;
  etapasFabricacionPremarcos: EtapaConfigurable[];
  etapasInstalacionPremarcos: EtapaConfigurable[];
  etapasFabrica: EtapaConfigurable[];
  etapasObra: EtapaConfigurable[];
}

function crearEtapasConfigurables(nombres: string[], seleccionadas: string[] = nombres): EtapaConfigurable[] {
  return nombres.map((nombre, indice) => ({
    id: `${indice}-${nombre}`,
    nombre,
    seleccionada: seleccionadas.includes(nombre)
  }));
}

function crearConfiguracionProducto(): ConfiguracionProductoFormulario {
  return {
    fabricaraPremarcos: false,
    instalaraPremarcos: false,
    etapasFabricacionPremarcos: crearEtapasConfigurables(ETAPAS_FABRICACION_PREMARCOS),
    etapasInstalacionPremarcos: crearEtapasConfigurables(ETAPAS_INSTALACION_PREMARCOS),
    etapasFabrica: crearEtapasConfigurables(
      [...ETAPAS_FABRICA, ...ETAPAS_FABRICA_OPCIONALES],
      ETAPAS_FABRICA
    ),
    etapasObra: crearEtapasConfigurables(ETAPAS_OBRA)
  };
}

function crearMapaConfiguraciones() {
  return Object.fromEntries(
    TIPOS_PRODUCTO.map((producto) => [producto.valor, crearConfiguracionProducto()])
  ) as Record<TipoProducto, ConfiguracionProductoFormulario>;
}

function etapasSeleccionadas(configuracion: EtapaConfigurable[]) {
  return configuracion
    .filter((etapa) => etapa.seleccionada)
    .map((etapa) => etapa.nombre.trim());
}

function tieneEtapasInvalidas(configuracion: EtapaConfigurable[]) {
  const nombres = etapasSeleccionadas(configuracion);
  return nombres.some((nombre) => !nombre) || new Set(nombres.map((nombre) => nombre.toLocaleLowerCase())).size !== nombres.length;
}

function EditorEtapas({
  idBase,
  contexto,
  titulo,
  descripcion,
  icono: Icono,
  valor,
  alCambiar,
  opcional = false,
  habilitado = true,
  alCambiarHabilitado
}: {
  idBase: string;
  contexto: string;
  titulo: string;
  descripcion: string;
  icono: typeof Factory;
  valor: EtapaConfigurable[];
  alCambiar: (valor: EtapaConfigurable[]) => void;
  opcional?: boolean;
  habilitado?: boolean;
  alCambiarHabilitado?: (habilitado: boolean) => void;
}) {
  const [nuevaEtapa, setNuevaEtapa] = useState("");

  const agregar = () => {
    const nombre = nuevaEtapa.trim();
    if (!nombre) return;
    alCambiar([
      ...valor,
      { id: `etapa-${Date.now()}-${Math.random().toString(16).slice(2)}`, nombre, seleccionada: true }
    ]);
    setNuevaEtapa("");
  };

  return (
    <section className="rounded-xl border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 font-heading text-sm font-semibold">
            <Icono className="size-4 text-primary" strokeWidth={1.75} /> {titulo}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{descripcion}</p>
        </div>
        {opcional && (
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor={idBase} className="text-xs">{habilitado ? "Sí" : "No"}</Label>
            <Switch
              id={idBase}
              checked={habilitado}
              onCheckedChange={alCambiarHabilitado}
              aria-label={`Activar ${titulo} de ${contexto}`}
            />
          </div>
        )}
      </div>

      {habilitado ? (
        <div className="mt-4 space-y-2">
          {valor.map((etapa) => (
            <div key={etapa.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => alCambiar(valor.map((item) => item.id === etapa.id ? { ...item, seleccionada: !item.seleccionada } : item))}
                aria-pressed={etapa.seleccionada}
                aria-label={`${etapa.seleccionada ? "Quitar" : "Agregar"} etapa ${etapa.nombre} de ${contexto}`}
                className={`grid size-9 shrink-0 place-items-center rounded-lg border transition-colors ${
                  etapa.seleccionada ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:text-foreground"
                }`}
              >
                {etapa.seleccionada && <Check className="size-4" />}
              </button>
              <Input
                value={etapa.nombre}
                onChange={(evento) => alCambiar(valor.map((item) => item.id === etapa.id ? { ...item, nombre: evento.target.value } : item))}
                aria-label={`Nombre de etapa ${etapa.nombre} de ${contexto}`}
                className={etapa.seleccionada ? "" : "text-muted-foreground line-through opacity-70"}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => alCambiar(valor.filter((item) => item.id !== etapa.id))}
                aria-label={`Eliminar etapa ${etapa.nombre} de ${contexto}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={nuevaEtapa}
              onChange={(evento) => setNuevaEtapa(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") {
                  evento.preventDefault();
                  agregar();
                }
              }}
              placeholder="Agregar una etapa"
              aria-label={`Nueva etapa para ${titulo} de ${contexto}`}
            />
            <Button type="button" variant="outline" className="shrink-0 gap-1.5" onClick={agregar} disabled={!nuevaEtapa.trim()}>
              <Plus className="size-4" /> Agregar
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Este grupo no se agregará al seguimiento de {contexto}.
        </p>
      )}
    </section>
  );
}

export default function Proyectos() {
  const { user } = useAuth();
  const hoy = new Date().toISOString().slice(0, 10);
  const [filtro, setFiltro] = useState<EstadoObra | "todas">("todas");
  const [listaProyectos, setListaProyectos] = useState<Proyecto[]>(() => obtenerProyectos());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [liderId, setLiderId] = useState("");
  const [tiposSeleccionados, setTiposSeleccionados] = useState<TipoProducto[]>([]);
  const [configuraciones, setConfiguraciones] = useState<Record<TipoProducto, ConfiguracionProductoFormulario>>(
    () => crearMapaConfiguraciones()
  );
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [presupuesto, setPresupuesto] = useState<PresupuestoEjecutivo>();
  const [vista, setVista] = useState<"tarjetas" | "tablero">(
    () => (localStorage.getItem("co-vista-proyectos") === "tablero" ? "tablero" : "tarjetas")
  );
  if (!user) return null;

  const cambiarVista = (nueva: "tarjetas" | "tablero") => {
    setVista(nueva);
    localStorage.setItem("co-vista-proyectos", nueva);
  };

  const actualizarProyecto = (actualizado: Proyecto) => {
    try {
      guardarProyecto(actualizado);
    } catch {
      toast("No se pudo guardar", { description: "El almacenamiento local está lleno. Probá con una imagen más pequeña." });
      return;
    }
    setListaProyectos((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
  };

  const visibles = listaProyectos.filter((proyecto) => filtro === "todas" || proyecto.estado === filtro);
  const responsables = usuarios.filter((usuario) => usuario.isActive && (usuario.role === "administrator" || usuario.role === "supervisor"));
  const productosConfigurables = tiposSeleccionados.filter((tipo) => tipo !== "servicios");
  const incluyeServicios = tiposSeleccionados.includes("servicios");

  const alternarTipoProducto = (tipo: TipoProducto) => {
    setTiposSeleccionados((actuales) =>
      actuales.includes(tipo) ? actuales.filter((seleccionado) => seleccionado !== tipo) : [...actuales, tipo]
    );
  };

  const actualizarConfiguracion = (tipo: TipoProducto, cambios: Partial<ConfiguracionProductoFormulario>) => {
    setConfiguraciones((actuales) => ({
      ...actuales,
      [tipo]: { ...actuales[tipo], ...cambios }
    }));
  };

  const reiniciarFormulario = () => {
    setNombre("");
    setClienteId("");
    setUbicacion("");
    setLiderId("");
    setTiposSeleccionados([]);
    setConfiguraciones(crearMapaConfiguraciones());
    setFechaInicio(hoy);
    setPresupuesto(undefined);
  };

  const cambiarModal = (abierto: boolean) => {
    setModalAbierto(abierto);
    if (!abierto) reiniciarFormulario();
  };

  const crearProyecto = () => {
    const nombreLimpio = nombre.trim();
    const ubicacionLimpia = ubicacion.trim();

    if (!nombreLimpio || !clienteId || tiposSeleccionados.length === 0 || !fechaInicio) {
      toast("Faltan datos", { description: "Nombre, cliente, al menos un producto y fecha de inicio son obligatorios." });
      return;
    }
    if (!presupuesto || presupuesto.items.length === 0) {
      toast("Falta el presupuesto ejecutivo", {
        description: "Subí la última versión del PDF y confirmá al menos un componente."
      });
      return;
    }
    const itemInvalido = presupuesto.items.find(
      (item) => !item.codigo.trim() || !item.descripcion.trim() || item.cantidad <= 0 || !tiposSeleccionados.includes(item.tipoProducto)
    );
    if (itemInvalido) {
      toast("Revisá los componentes", {
        description: "Cada fila necesita código, descripción, cantidad positiva y un producto seleccionado en el proyecto."
      });
      return;
    }

    for (const tipo of productosConfigurables) {
      const etiquetaProducto = nombreTipoProducto(tipo);
      const configuracion = configuraciones[tipo];
      if (!presupuesto.items.some((item) => item.tipoProducto === tipo)) {
        toast(`Revisá ${etiquetaProducto}`, {
          description: "Asigná al menos un componente del presupuesto a este producto."
        });
        return;
      }
      const fabricaSeleccionada = etapasSeleccionadas(configuracion.etapasFabrica);
      const obraSeleccionada = etapasSeleccionadas(configuracion.etapasObra);
      const fabricacionPremarcosSeleccionada = configuracion.fabricaraPremarcos
        ? etapasSeleccionadas(configuracion.etapasFabricacionPremarcos)
        : [];
      const instalacionPremarcosSeleccionada = configuracion.instalaraPremarcos
        ? etapasSeleccionadas(configuracion.etapasInstalacionPremarcos)
        : [];

      if (fabricaSeleccionada.length === 0 || obraSeleccionada.length === 0) {
        toast(`Revisá ${etiquetaProducto}`, { description: "Fábrica e instalación deben conservar al menos una etapa seleccionada." });
        return;
      }
      if (configuracion.fabricaraPremarcos && fabricacionPremarcosSeleccionada.length === 0) {
        toast(`Revisá ${etiquetaProducto}`, { description: "La fabricación de premarcos necesita al menos una etapa seleccionada." });
        return;
      }
      if (configuracion.instalaraPremarcos && instalacionPremarcosSeleccionada.length === 0) {
        toast(`Revisá ${etiquetaProducto}`, { description: "La instalación de premarcos necesita al menos una etapa seleccionada." });
        return;
      }

      const gruposActivos = [
        ...(configuracion.fabricaraPremarcos ? [{ nombre: "Fabricación de premarcos", etapas: configuracion.etapasFabricacionPremarcos }] : []),
        ...(configuracion.instalaraPremarcos ? [{ nombre: "Instalación de premarcos", etapas: configuracion.etapasInstalacionPremarcos }] : []),
        { nombre: "Fábrica", etapas: configuracion.etapasFabrica },
        { nombre: "Instalación", etapas: configuracion.etapasObra }
      ];
      const grupoInvalido = gruposActivos.find((grupo) => tieneEtapasInvalidas(grupo.etapas));
      if (grupoInvalido) {
        toast(`Revisá ${etiquetaProducto}`, {
          description: `${grupoInvalido.nombre} contiene nombres vacíos o repetidos.`
        });
        return;
      }
    }

    const productos: ConfiguracionProductoProyecto[] = tiposSeleccionados.map((tipo) => {
      if (tipo === "servicios") {
        return {
          tipo,
          etapasFabricacionPremarcos: [],
          etapasInstalacionPremarcos: [],
          etapasFabrica: [],
          etapasObra: []
        };
      }

      const configuracion = configuraciones[tipo];
      return {
        tipo,
        etapasFabricacionPremarcos: etapas(
          configuracion.fabricaraPremarcos ? etapasSeleccionadas(configuracion.etapasFabricacionPremarcos) : [],
          []
        ),
        etapasInstalacionPremarcos: etapas(
          configuracion.instalaraPremarcos ? etapasSeleccionadas(configuracion.etapasInstalacionPremarcos) : [],
          []
        ),
        etapasFabrica: etapas(etapasSeleccionadas(configuracion.etapasFabrica), []),
        etapasObra: etapas(etapasSeleccionadas(configuracion.etapasObra), [])
      };
    });

    const etapasFabricacionPremarcosProyecto = productos.flatMap((producto) => producto.etapasFabricacionPremarcos);
    const etapasInstalacionPremarcosProyecto = productos.flatMap((producto) => producto.etapasInstalacionPremarcos);
    const etapasFabricaProyecto = productos.flatMap((producto) => producto.etapasFabrica);
    const etapasObraProyecto = productos.flatMap((producto) => producto.etapasObra);
    const hitos = productos.flatMap((producto) => {
      const etiquetaProducto = nombreTipoProducto(producto.tipo);
      return [
        ...producto.etapasFabricacionPremarcos.map((etapa) => `Fabricación de premarcos · ${etapa.nombre}`),
        ...producto.etapasInstalacionPremarcos.map((etapa) => `Instalación de premarcos · ${etapa.nombre}`),
        ...producto.etapasFabrica.map((etapa) => `Fábrica · ${etapa.nombre}`),
        ...producto.etapasObra.map((etapa) => `Instalación · ${etapa.nombre}`)
      ].map((etapa) => ({ etapa: `${etiquetaProducto} · ${etapa}`, inicio: fechaInicio, fin: fechaInicio }));
    });
    const soloServicios = productos.every((producto) => producto.tipo === "servicios");
    const tareasPresupuesto = generarTareasDesdePresupuesto(productos, presupuesto.items);
    const aberturas = presupuesto.items
      .filter((item) => item.tipoProducto === "aberturas_aluminio" || item.tipoProducto === "aberturas_pvc")
      .map((item) => ({
        codigo: item.codigo,
        descripcion: item.descripcion,
        material: item.tipoProducto === "aberturas_pvc" ? "PVC" as const : "ALU" as const,
        cantidad: item.cantidad,
        ancho: item.ancho,
        alto: item.alto
      }));

    const nuevo: Proyecto = {
      id: `p-${Date.now()}`,
      nombre: nombreLimpio,
      clienteId,
      ubicacion: ubicacionLimpia || "Sin ubicación",
      liderId,
      productos,
      estado: "planificada",
      fechaCreacion: hoy,
      fechaInicio,
      fechaFinEstimada: "",
      avanceFabrica: 0,
      avanceObra: 0,
      etapasFabricacionPremarcos: etapasFabricacionPremarcosProyecto,
      etapasInstalacionPremarcos: etapasInstalacionPremarcosProyecto,
      etapasFabrica: etapasFabricaProyecto,
      etapasObra: etapasObraProyecto,
      aberturas,
      cronograma: hitos,
      documentos: [{
        nombre: presupuesto.nombreArchivo,
        tipo: "presupuesto",
        fecha: hoy,
        tamano: presupuesto.tamano < 1024 * 1024
          ? `${Math.max(1, Math.round(presupuesto.tamano / 1024))} KB`
          : `${(presupuesto.tamano / 1024 / 1024).toFixed(1)} MB`
      }],
      presupuestoEjecutivo: presupuesto,
      tareasPresupuesto,
      descripcion: soloServicios
        ? "Servicio creado desde presupuesto ejecutivo. No requiere seguimiento por etapas de fabricación o instalación."
        : `Proyecto creado desde el presupuesto ejecutivo ${presupuesto.numero || presupuesto.nombreArchivo}, con ${presupuesto.items.length} componente${presupuesto.items.length === 1 ? "" : "s"} verificado${presupuesto.items.length === 1 ? "" : "s"}.`
    };

    const actualizada = [nuevo, ...listaProyectos];
    setListaProyectos(actualizada);
    guardarProyectos(actualizada);
    cambiarModal(false);
    toast("Proyecto creado", { description: `${nuevo.nombre} · ${productos.length} producto${productos.length === 1 ? "" : "s"}` });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Obras</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Proyectos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              onClick={() => cambiarVista("tarjetas")}
              aria-pressed={vista === "tarjetas"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                vista === "tarjetas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-3.5" /> Tarjetas
            </button>
            <button
              type="button"
              onClick={() => cambiarVista("tablero")}
              aria-pressed={vista === "tablero"}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                vista === "tablero" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns3 className="size-3.5" /> Tablero
            </button>
          </div>
          {vista === "tarjetas" && (
            <Select value={filtro} onValueChange={(valor) => setFiltro(valor as EstadoObra | "todas")}>
              <SelectTrigger className="w-40" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTROS.map((opcion) => (
                  <SelectItem key={opcion.valor} value={opcion.valor}>{opcion.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {permisos.crearProyecto(user.role) && (
            <Button className="gap-2" onClick={() => setModalAbierto(true)}>
              <Plus className="size-4" /> Nuevo proyecto
            </Button>
          )}
        </div>
      </header>

      {vista === "tablero" && (
        <TableroProyectos
          proyectos={listaProyectos}
          puedeMover={permisos.cambiarEstadoProyecto(user.role)}
          puedeCancelar={permisos.cancelarProyecto(user.role)}
          puedeReabrir={permisos.reabrirProyecto(user.role)}
          usuarioId={user.id}
          alGuardar={actualizarProyecto}
        />
      )}

      <Dialog open={modalAbierto} onOpenChange={cambiarModal}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
            <DialogDescription>
              Seleccioná los productos, verificá el presupuesto ejecutivo y personalizá las etapas de cada uno.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[72vh] gap-5 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nombre-proyecto">Nombre del proyecto *</Label>
                <Input id="nombre-proyecto" value={nombre} onChange={(evento) => setNombre(evento.target.value)} placeholder="Ej. Proyecto 2680/26" />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="w-full" aria-label="Cliente">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.filter((cliente) => cliente.estado === "activo").map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>{cliente.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Líder</Label>
                <Select value={liderId} onValueChange={setLiderId}>
                  <SelectTrigger className="w-full" aria-label="Líder">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsables.map((responsable) => (
                      <SelectItem key={responsable.id} value={responsable.id}>{responsable.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div>
                  <Label>Tipos de producto *</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Podés seleccionar varios. Cada uno conserva sus propias etapas.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {TIPOS_PRODUCTO.map((producto) => {
                    const activo = tiposSeleccionados.includes(producto.valor);
                    return (
                      <button
                        key={producto.valor}
                        type="button"
                        onClick={() => alternarTipoProducto(producto.valor)}
                        aria-pressed={activo}
                        className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          activo ? "border-primary/50 bg-primary/10 text-foreground" : "text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        }`}
                      >
                        <span>{producto.label}</span>
                        <span className={`grid size-5 shrink-0 place-items-center rounded border ${activo ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                          {activo && <Check className="size-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ubicacion-proyecto">Ubicación</Label>
                <Input id="ubicacion-proyecto" value={ubicacion} onChange={(evento) => setUbicacion(evento.target.value)} placeholder="Ciudad, obra o dirección" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha-inicio-proyecto">Fecha de inicio *</Label>
                <Input id="fecha-inicio-proyecto" type="date" value={fechaInicio} onChange={(evento) => setFechaInicio(evento.target.value)} />
              </div>
            </div>

            <PresupuestoUploader
              valor={presupuesto}
              tiposSeleccionados={tiposSeleccionados}
              alCambiar={setPresupuesto}
            />

            {incluyeServicios && (
              <div className="rounded-xl border border-primary/25 bg-primary/8 p-4">
                <h3 className="font-heading text-sm font-semibold text-primary">Servicios</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Este producto se agrega sin etapas de premarcos, fábrica o instalación. Los demás productos conservan sus configuraciones independientes.
                </p>
              </div>
            )}

            {productosConfigurables.map((tipo) => {
              const configuracion = configuraciones[tipo];
              const etiquetaProducto = nombreTipoProducto(tipo);
              return (
                <section key={tipo} className="grid gap-4 rounded-2xl border border-primary/20 bg-primary/[0.025] p-4">
                  <div>
                    <div className="senal">Etapas del producto</div>
                    <h3 className="mt-1 font-heading text-lg font-semibold">{etiquetaProducto}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estos cambios se aplican solo a {etiquetaProducto.toLocaleLowerCase()} dentro de este proyecto.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <EditorEtapas
                      idBase={`${tipo}-fabricacion-premarcos`}
                      contexto={etiquetaProducto}
                      titulo="Fabricación de premarcos"
                      descripcion="Activala cuando Italplast deba fabricar los premarcos. Es independiente de la instalación."
                      icono={Ruler}
                      valor={configuracion.etapasFabricacionPremarcos}
                      alCambiar={(valor) => actualizarConfiguracion(tipo, { etapasFabricacionPremarcos: valor })}
                      opcional
                      habilitado={configuracion.fabricaraPremarcos}
                      alCambiarHabilitado={(valor) => actualizarConfiguracion(tipo, { fabricaraPremarcos: valor })}
                    />
                    <EditorEtapas
                      idBase={`${tipo}-instalacion-premarcos`}
                      contexto={etiquetaProducto}
                      titulo="Instalación de premarcos"
                      descripcion="Activala cuando Italplast deba instalar premarcos propios o existentes."
                      icono={Hammer}
                      valor={configuracion.etapasInstalacionPremarcos}
                      alCambiar={(valor) => actualizarConfiguracion(tipo, { etapasInstalacionPremarcos: valor })}
                      opcional
                      habilitado={configuracion.instalaraPremarcos}
                      alCambiarHabilitado={(valor) => actualizarConfiguracion(tipo, { instalaraPremarcos: valor })}
                    />
                    <EditorEtapas
                      idBase={`${tipo}-fabrica`}
                      contexto={etiquetaProducto}
                      titulo="Etapas de fábrica"
                      descripcion="Grupo obligatorio para la fabricación de este producto."
                      icono={Factory}
                      valor={configuracion.etapasFabrica}
                      alCambiar={(valor) => actualizarConfiguracion(tipo, { etapasFabrica: valor })}
                    />
                    <EditorEtapas
                      idBase={`${tipo}-obra`}
                      contexto={etiquetaProducto}
                      titulo="Etapas de instalación"
                      descripcion="Grupo obligatorio para la instalación y cierre de este producto."
                      icono={HardHat}
                      valor={configuracion.etapasObra}
                      alCambiar={(valor) => actualizarConfiguracion(tipo, { etapasObra: valor })}
                    />
                  </div>
                </section>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => cambiarModal(false)}>Cancelar</Button>
            <Button onClick={crearProyecto}>Crear proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {vista === "tarjetas" && <section className="grid gap-4 md:grid-cols-2">
        {visibles.map((proyecto) => {
          const lider = usuarioPorId(proyecto.liderId);
          const productosProyecto = proyecto.productos?.length
            ? proyecto.productos
            : proyecto.tipoProducto
              ? [{ tipo: proyecto.tipoProducto }]
              : [];
          const soloServicios = productosProyecto.length > 0 && productosProyecto.every((producto) => producto.tipo === "servicios");
          return (
            <Link key={proyecto.id} to={`/proyectos/${proyecto.id}`} className="group">
              <Card className="h-full gap-4 py-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                <CardContent className="space-y-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-heading text-lg font-bold tracking-tight group-hover:text-primary">
                        {proyecto.nombre}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{proyecto.ubicacion}</span>
                      </div>
                      {productosProyecto.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {productosProyecto.map((producto) => (
                            <span key={producto.tipo} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {nombreTipoProducto(producto.tipo)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <EstadoBadge estado={proyecto.estado} className="shrink-0" />
                  </div>

                  {soloServicios ? (
                    <div className="rounded-lg border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                      Servicio sin seguimiento por etapas de fábrica o instalación.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Factory className="size-3" /> Fábrica</span>
                        </div>
                        <AvanceMeter
                          valor={avanceGrupo(proyecto, ["fabricacion_premarcos", "fabrica"], proyecto.avanceFabrica)}
                          etapas={proyecto.etapasFabrica.length}
                          size="sm"
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><HardHat className="size-3" /> Instalación</span>
                        </div>
                        <AvanceMeter
                          valor={avanceGrupo(proyecto, ["instalacion_premarcos", "instalacion"], proyecto.avanceObra)}
                          etapas={proyecto.etapasObra.length}
                          size="sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span className="truncate">{clientePorId(proyecto.clienteId)?.nombre}</span>
                    <span className="cifra shrink-0">
                      {soloServicios ? formatFecha(proyecto.fechaInicio) : `${avanceGeneral(proyecto)}% · ${formatFecha(proyecto.fechaFinEstimada)}`}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Líder: <span className="font-medium text-foreground">{lider?.displayName ?? "Sin asignar"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>}

      {vista === "tarjetas" && visibles.length === 0 && (
        <Card className="py-14">
          <CardContent className="text-center text-sm text-muted-foreground">
            No hay proyectos con este estado. Cambiá el filtro para ver el resto.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
