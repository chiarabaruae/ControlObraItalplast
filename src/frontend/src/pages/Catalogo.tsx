import { useState } from "react";
import { ArchiveRestore, Check, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  guardarOverridesCatalogo,
  guardarProductosPersonalizados,
  obtenerCatalogoProductos,
  obtenerOverridesCatalogo,
  obtenerProductosPersonalizados,
  registrarAuditoriaCatalogo,
  type ProductoCatalogo
} from "@/mocks/data";
import { useAuth } from "@/context/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

function slugDeNombre(nombre: string) {
  return nombre
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function SeccionCatalogo() {
  const { user } = useAuth();
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [llevaPremarcos, setLlevaPremarcos] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [fabricacionEdicion, setFabricacionEdicion] = useState(true);
  const [instalacionEdicion, setInstalacionEdicion] = useState(true);
  // Contador para releer el catálogo tras cada cambio persistido.
  const [refresco, setRefresco] = useState(0);
  const catalogo = obtenerCatalogoProductos();
  void refresco;

  const usuarioId = user?.id ?? "";

  const comenzarEdicion = (producto: ProductoCatalogo) => {
    setEditando(String(producto.valor));
    setNombreEdicion(producto.label);
    setFabricacionEdicion(producto.llevaFabricacionPremarcos ?? producto.llevaPremarcos);
    setInstalacionEdicion(producto.llevaInstalacionPremarcos ?? producto.llevaPremarcos);
  };

  /** Persiste cambios de un producto: overrides para estándar, lista para personalizados. */
  const aplicarCambio = (
    producto: ProductoCatalogo,
    cambios: { label?: string; llevaFabricacionPremarcos?: boolean; llevaInstalacionPremarcos?: boolean; activo?: boolean }
  ) => {
    if (producto.base) {
      const overrides = obtenerOverridesCatalogo();
      overrides[String(producto.valor)] = { ...overrides[String(producto.valor)], ...cambios };
      guardarOverridesCatalogo(overrides);
    } else {
      guardarProductosPersonalizados(
        obtenerProductosPersonalizados().map((item) =>
          item.valor === producto.valor
            ? { ...item, ...cambios, llevaPremarcos: (cambios.llevaFabricacionPremarcos ?? item.llevaFabricacionPremarcos ?? item.llevaPremarcos) || (cambios.llevaInstalacionPremarcos ?? item.llevaInstalacionPremarcos ?? item.llevaPremarcos) }
            : item
        )
      );
    }
    setRefresco((n) => n + 1);
  };

  const guardarEdicion = () => {
    const objetivo = catalogo.find((producto) => producto.valor === editando);
    if (!objetivo) return;
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
    aplicarCambio(objetivo, {
      label,
      llevaFabricacionPremarcos: fabricacionEdicion,
      llevaInstalacionPremarcos: instalacionEdicion
    });
    registrarAuditoriaCatalogo({
      usuarioId,
      accion: "editar",
      valor: String(objetivo.valor),
      detalle: `Nombre: ${label} · Fabricación de premarcos: ${fabricacionEdicion ? "sí" : "no"} · Instalación de premarcos: ${instalacionEdicion ? "sí" : "no"}`
    });
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
    guardarProductosPersonalizados([
      ...obtenerProductosPersonalizados(),
      { valor, label, llevaPremarcos, llevaFabricacionPremarcos: llevaPremarcos, llevaInstalacionPremarcos: llevaPremarcos }
    ]);
    registrarAuditoriaCatalogo({ usuarioId, accion: "crear", valor, detalle: `Nombre: ${label}` });
    setRefresco((n) => n + 1);
    setNombreNuevo("");
    setLlevaPremarcos(true);
    toast("Producto agregado", { description: `"${label}" ya está disponible al crear proyectos.` });
  };

  const desactivar = (producto: ProductoCatalogo) => {
    aplicarCambio(producto, { activo: false });
    registrarAuditoriaCatalogo({ usuarioId, accion: "desactivar", valor: String(producto.valor) });
    toast("Producto retirado", {
      description: `"${producto.label}" ya no se ofrece en proyectos nuevos. Los proyectos existentes no cambian.`
    });
  };

  const reactivar = (producto: ProductoCatalogo) => {
    aplicarCambio(producto, { activo: true });
    registrarAuditoriaCatalogo({ usuarioId, accion: "reactivar", valor: String(producto.valor) });
    toast("Producto restaurado", { description: `"${producto.label}" vuelve a ofrecerse al crear proyectos.` });
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
          {catalogo.map((producto) => {
            const esServicios = producto.valor === "servicios";
            const inactivo = producto.activo === false;
            const etiquetaEtapas = esServicios
              ? "Sin etapas de seguimiento"
              : [
                  producto.llevaFabricacionPremarcos ? "Fabricación de premarcos" : null,
                  producto.llevaInstalacionPremarcos ? "Instalación de premarcos" : null
                ].filter(Boolean).join(" + ") || "Sin premarcos";

            return (
              <li key={producto.valor} className={`flex items-center gap-3 px-4 py-2.5 ${inactivo ? "opacity-55" : ""}`}>
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
                      {!esServicios && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`editar-fab-premarcos-${producto.valor}`}
                              checked={fabricacionEdicion}
                              onCheckedChange={setFabricacionEdicion}
                            />
                            <Label htmlFor={`editar-fab-premarcos-${producto.valor}`} className="text-xs">
                              Ofrece fabricación de premarcos
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`editar-inst-premarcos-${producto.valor}`}
                              checked={instalacionEdicion}
                              onCheckedChange={setInstalacionEdicion}
                            />
                            <Label htmlFor={`editar-inst-premarcos-${producto.valor}`} className="text-xs">
                              Ofrece instalación de premarcos
                            </Label>
                          </div>
                        </div>
                      )}
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
                        {etiquetaEtapas}
                        {inactivo && " · Retirado"}
                      </div>
                    </div>
                    {inactivo ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => reactivar(producto)}
                        aria-label={`Restaurar ${producto.label} al catálogo`}
                      >
                        <ArchiveRestore className="size-4" />
                      </Button>
                    ) : (
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
                          onClick={() => desactivar(producto)}
                          aria-label={`Retirar ${producto.label} del catálogo`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </li>
            );
          })}
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

export default function Catalogo() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="senal">Administración</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Catálogo de productos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tipos de producto disponibles al crear proyectos, con sus etapas de premarcos.
        </p>
      </header>

      <SeccionCatalogo />
    </div>
  );
}
