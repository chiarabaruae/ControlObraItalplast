import { useState } from "react";
import { CalendarClock, Check, Package, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import {
  BUFFERS_PREDETERMINADOS,
  guardarBuffersPlanificacion,
  obtenerBuffersPlanificacion,
  type BuffersPlanificacion
} from "@/lib/planificacion";
import {
  guardarProductosPersonalizados,
  obtenerCatalogoProductos,
  obtenerProductosPersonalizados,
  type ProductoCatalogo
} from "@/mocks/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const CAMPOS_BRECHAS: { clave: keyof BuffersPlanificacion; label: string; descripcion: string }[] = [
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

function slugDeNombre(nombre: string) {
  return nombre
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function SeccionBrechas() {
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
    for (const campo of CAMPOS_BRECHAS) {
      const numero = Number(valores[campo.clave]);
      if (!Number.isInteger(numero) || numero < 0) {
        toast("Revisá las brechas", { description: `"${campo.label}" necesita un número entero de días (0 o más).` });
        return;
      }
      buffers[campo.clave] = numero;
    }
    guardarBuffersPlanificacion(buffers);
    toast("Brechas guardadas", { description: "Las nuevas brechas se aplicarán a las próximas estimaciones de fechas." });
  };

  const restaurar = () => {
    setValores({
      diasProduccionAInstalacion: String(BUFFERS_PREDETERMINADOS.diasProduccionAInstalacion),
      diasAbacoAFabrica: String(BUFFERS_PREDETERMINADOS.diasAbacoAFabrica),
      diasPremarcosAAbaco: String(BUFFERS_PREDETERMINADOS.diasPremarcosAAbaco)
    });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </div>
          <div>
            <CardTitle>Brechas de planificación backward</CardTitle>
            <CardDescription>
              Días entre hitos al estimar fechas desde el inicio comprometido de instalación.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        {CAMPOS_BRECHAS.map((campo) => (
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
            <Save className="size-4" /> Guardar brechas
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Los cambios afectan solo a las estimaciones futuras; las fechas ya asignadas a tareas existentes no se recalculan.
          Para una excepción puntual, ajustá los plazos dentro del proyecto: en la planificación del producto al crearlo,
          o editando las fechas de sus tareas desde el seguimiento.
        </p>
      </CardContent>
    </Card>
  );
}

function SeccionCatalogo() {
  const [personalizados, setPersonalizados] = useState<ProductoCatalogo[]>(() => obtenerProductosPersonalizados());
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [llevaPremarcos, setLlevaPremarcos] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [premarcosEdicion, setPremarcosEdicion] = useState(true);
  const catalogo = obtenerCatalogoProductos();

  const comenzarEdicion = (producto: ProductoCatalogo) => {
    setEditando(String(producto.valor));
    setNombreEdicion(producto.label);
    setPremarcosEdicion(producto.llevaPremarcos);
  };

  const guardarEdicion = () => {
    const label = nombreEdicion.trim();
    if (!label) {
      toast("Falta el nombre", { description: "El producto necesita un nombre." });
      return;
    }
    const duplicado = catalogo.find(
      (producto) => producto.valor !== editando && producto.label.toLocaleLowerCase() === label.toLocaleLowerCase()
    );
    if (duplicado) {
      toast("Nombre duplicado", { description: `Ya existe "${duplicado.label}" en el catálogo.` });
      return;
    }
    const nuevos = personalizados.map((producto) =>
      producto.valor === editando ? { ...producto, label, llevaPremarcos: premarcosEdicion } : producto
    );
    guardarProductosPersonalizados(nuevos);
    setPersonalizados(nuevos);
    setEditando(null);
    toast("Producto actualizado", { description: `"${label}" se aplicará así en los próximos proyectos.` });
  };

  const agregar = () => {
    const label = nombreNuevo.trim();
    if (!label) {
      toast("Falta el nombre", { description: "Ingresá el nombre del nuevo tipo de producto." });
      return;
    }
    const valor = slugDeNombre(label);
    if (!valor) {
      toast("Nombre inválido", { description: "El nombre necesita al menos una letra o número." });
      return;
    }
    const existente = catalogo.find(
      (producto) => producto.valor === valor || producto.label.toLocaleLowerCase() === label.toLocaleLowerCase()
    );
    if (existente) {
      toast("Producto duplicado", { description: `Ya existe "${existente.label}" en el catálogo.` });
      return;
    }
    const nuevos = [...personalizados, { valor, label, llevaPremarcos }];
    guardarProductosPersonalizados(nuevos);
    setPersonalizados(nuevos);
    setNombreNuevo("");
    setLlevaPremarcos(true);
    toast("Producto agregado", { description: `"${label}" ya está disponible al crear proyectos.` });
  };

  const eliminar = (valor: string) => {
    const producto = personalizados.find((item) => item.valor === valor);
    const nuevos = personalizados.filter((item) => item.valor !== valor);
    guardarProductosPersonalizados(nuevos);
    setPersonalizados(nuevos);
    toast("Producto retirado", {
      description: `"${producto?.label}" ya no se ofrece en proyectos nuevos. Los proyectos existentes no cambian.`
    });
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </div>
          <div>
            <CardTitle>Catálogo de productos</CardTitle>
            <CardDescription>
              Los tipos agregados acá aparecen al crear proyectos, con o sin etapas de premarcos según se indique.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <ul className="divide-y rounded-xl border">
          {catalogo.map((producto) => (
            <li key={producto.valor} className="flex items-center gap-3 px-4 py-2.5">
              {editando === producto.valor ? (
                <>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={nombreEdicion}
                      onChange={(evento) => setNombreEdicion(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === "Enter") {
                          evento.preventDefault();
                          guardarEdicion();
                        }
                        if (evento.key === "Escape") setEditando(null);
                      }}
                      aria-label={`Nuevo nombre de ${producto.label}`}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`editar-premarcos-${producto.valor}`}
                        checked={premarcosEdicion}
                        onCheckedChange={setPremarcosEdicion}
                      />
                      <Label htmlFor={`editar-premarcos-${producto.valor}`} className="text-xs">Lleva premarcos</Label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-primary"
                    onClick={guardarEdicion}
                    aria-label={`Guardar cambios de ${producto.label}`}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground"
                    onClick={() => setEditando(null)}
                    aria-label={`Cancelar edición de ${producto.label}`}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{producto.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {producto.base ? "Estándar" : "Personalizado"}
                      {" · "}
                      {producto.valor === "servicios"
                        ? "Sin etapas de seguimiento"
                        : producto.llevaPremarcos
                          ? "Con premarcos opcionales"
                          : "Sin premarcos"}
                    </div>
                  </div>
                  {!producto.base && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => comenzarEdicion(producto)}
                        aria-label={`Editar ${producto.label}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => eliminar(String(producto.valor))}
                        aria-label={`Retirar ${producto.label} del catálogo`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="rounded-xl border p-4">
          <h4 className="font-heading text-sm font-semibold">Nuevo tipo de producto</h4>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="catalogo-nombre">Nombre</Label>
              <Input
                id="catalogo-nombre"
                value={nombreNuevo}
                onChange={(evento) => setNombreNuevo(evento.target.value)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    evento.preventDefault();
                    agregar();
                  }
                }}
                placeholder="Ej.: Aberturas de madera"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="catalogo-premarcos" checked={llevaPremarcos} onCheckedChange={setLlevaPremarcos} />
              <Label htmlFor="catalogo-premarcos" className="text-sm">Lleva premarcos</Label>
            </div>
            <Button className="gap-1.5" onClick={agregar} disabled={!nombreNuevo.trim()}>
              <Plus className="size-4" /> Agregar
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Si no lleva premarcos, los grupos de fabricación e instalación de premarcos no se ofrecen para este producto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reglas() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Administración</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Reglas y catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas de negocio editables: brechas del cálculo backward de fechas y catálogo de tipos de producto.
        </p>
      </header>

      <SeccionBrechas />
      <SeccionCatalogo />
    </div>
  );
}
