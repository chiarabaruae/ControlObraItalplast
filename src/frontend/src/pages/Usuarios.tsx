import { useState, type FormEvent } from "react";
import { Plus, Pencil, KeyRound, Archive, ArchiveRestore, Tags, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { useTablaFiltrable } from "@/lib/tabla-filtros";
import { usuarios as usuariosMock, obtenerCargos, guardarCargos, type Usuario } from "@/mocks/data";
import { PermisosPorAccion } from "@/components/app/PermisosPorAccion";
import { AvisoFiltros, EncabezadoFiltrable } from "@/components/app/EncabezadoFiltrable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

interface FormularioUsuario {
  nombre: string;
  cargo: string;
  area: string;
  rol: Role;
  correo: string;
  telefono: string;
}

const FORMULARIO_VACIO: FormularioUsuario = {
  nombre: "",
  cargo: "",
  area: "",
  rol: "viewer",
  correo: "",
  telefono: ""
};

export default function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Usuario[]>(usuariosMock);
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null);
  const [formulario, setFormulario] = useState<FormularioUsuario>(FORMULARIO_VACIO);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [cargos, setCargos] = useState<string[]>(() => obtenerCargos());
  const [gestorCargosAbierto, setGestorCargosAbierto] = useState(false);
  const [nuevoCargo, setNuevoCargo] = useState("");
  const tabla = useTablaFiltrable(lista, {
    usuario: (u) => u.displayName,
    cargo: (u) => u.positionTitle,
    area: (u) => u.department,
    rol: (u) => ROLE_LABELS[u.role]
  });
  if (!user) return null;

  const activos = lista.filter((u) => u.isActive).length;

  const abrirNuevoUsuario = () => {
    setUsuarioEnEdicion(null);
    setFormulario(FORMULARIO_VACIO);
    setErrorFormulario("");
    setEditorAbierto(true);
  };

  const abrirEdicion = (usuario: Usuario) => {
    setUsuarioEnEdicion(usuario);
    setFormulario({
      nombre: usuario.displayName,
      cargo: usuario.positionTitle ?? "",
      area: usuario.department,
      rol: usuario.role,
      correo: usuario.email ?? "",
      telefono: usuario.telefono ?? ""
    });
    setErrorFormulario("");
    setEditorAbierto(true);
  };

  const cambiarEditor = (abierto: boolean) => {
    setEditorAbierto(abierto);
    if (!abierto) {
      setUsuarioEnEdicion(null);
      setErrorFormulario("");
    }
  };

  const guardarUsuario = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombre = formulario.nombre.trim();
    const area = formulario.area.trim();
    const cargo = formulario.cargo.trim();
    if (!nombre || !area || !cargo) {
      setErrorFormulario("Completá el nombre, el cargo y el área para guardar el usuario.");
      return;
    }

    const datosActualizados = {
      displayName: nombre,
      positionTitle: cargo,
      department: area,
      role: formulario.rol,
      email: formulario.correo.trim() || undefined,
      telefono: formulario.telefono.trim() || undefined
    };

    if (usuarioEnEdicion) {
      setLista((prev) => prev.map((actual) => (
        actual.id === usuarioEnEdicion.id ? { ...actual, ...datosActualizados } : actual
      )));
      toast("Usuario actualizado", { description: nombre });
    } else {
      const identificador = Date.now().toString();
      setLista((prev) => [
        ...prev,
        {
          id: `u-${identificador}`,
          username: `pendiente-${identificador}`,
          isActive: true,
          ...datosActualizados
        }
      ]);
      toast("Usuario creado", { description: `${nombre} fue agregado como ${ROLE_LABELS[formulario.rol]}.` });
    }

    cambiarEditor(false);
  };

  const alternarActivo = (u: Usuario) => {
    setLista((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    toast(u.isActive ? "Usuario archivado" : "Usuario reactivado", { description: u.displayName });
  };

  const solicitarCambioContrasena = (u: Usuario) => {
    toast("Cambio de contraseña", {
      description: `En una próxima versión se enviará un link de restablecimiento al correo asociado a ${u.displayName}.`
    });
  };

  const agregarCargo = () => {
    const limpio = nuevoCargo.trim();
    if (!limpio) return;
    if (cargos.some((c) => c.toLocaleLowerCase() === limpio.toLocaleLowerCase())) {
      toast("Cargo duplicado", { description: `"${limpio}" ya existe en la lista.` });
      return;
    }
    const actualizados = [...cargos, limpio].sort((a, b) => a.localeCompare(b));
    setCargos(actualizados);
    guardarCargos(actualizados);
    setNuevoCargo("");
  };

  const quitarCargo = (cargo: string) => {
    if (lista.some((u) => u.positionTitle === cargo)) {
      toast("Cargo en uso", { description: `"${cargo}" está asignado a alguien. Cambiá ese usuario antes de quitarlo.` });
      return;
    }
    const actualizados = cargos.filter((c) => c !== cargo);
    setCargos(actualizados);
    guardarCargos(actualizados);
  };

  // Garantiza que el cargo actual del formulario siempre sea seleccionable.
  const opcionesCargo = formulario.cargo && !cargos.includes(formulario.cargo)
    ? [formulario.cargo, ...cargos]
    : cargos;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Ajustes</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="cifra font-semibold text-foreground">{activos}</span> activos de{" "}
            <span className="cifra">{lista.length}</span> · el rol define qué ve y qué puede hacer cada persona.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => { setNuevoCargo(""); setGestorCargosAbierto(true); }}>
            <Tags className="size-4" /> Gestionar cargos
          </Button>
          <Button className="gap-2" onClick={abrirNuevoUsuario}>
            <Plus className="size-4" /> Nuevo usuario
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="px-0">
          <AvisoFiltros control={tabla} unidad="personas" />
          <Table>
            <TableHeader>
              <TableRow>
                <EncabezadoFiltrable columna="usuario" control={tabla}>Usuario</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="cargo" control={tabla}>Cargo</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="area" control={tabla}>Área</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="rol" control={tabla}>Rol</EncabezadoFiltrable>
                <TableHead className="w-36 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabla.filas.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? "opacity-55" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
                          {iniciales(u.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{u.displayName}</div>
                        {(u.email || u.telefono) && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {[u.email, u.telefono].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.positionTitle}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.department}</TableCell>
                  <TableCell className="text-sm">{ROLE_LABELS[u.role]}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar a ${u.displayName}`} onClick={() => abrirEdicion(u)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Cambiar contraseña de ${u.displayName}`} onClick={() => solicitarCambioContrasena(u)}>
                        <KeyRound className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={u.isActive ? `Archivar a ${u.displayName}` : `Reactivar a ${u.displayName}`} onClick={() => alternarActivo(u)}>
                        {u.isActive ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {tabla.filas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ninguna persona coincide con el filtro aplicado.
            </p>
          )}
        </CardContent>
      </Card>

      <PermisosPorAccion usuarios={lista} otorganteId={user.id} />

      <Dialog open={editorAbierto} onOpenChange={cambiarEditor}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{usuarioEnEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {usuarioEnEdicion
                ? "Actualizá la información y los permisos de esta persona."
                : "Completá los datos necesarios para incorporar una persona al sistema."}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={guardarUsuario}>
            <p className="text-xs text-muted-foreground"><span className="text-destructive">*</span> Campos obligatorios</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="usuario-nombre">Nombre completo <span className="text-destructive">*</span></Label>
                <Input
                  id="usuario-nombre"
                  autoFocus
                  required
                  value={formulario.nombre}
                  onChange={(event) => {
                    setFormulario((actual) => ({ ...actual, nombre: event.target.value }));
                    setErrorFormulario("");
                  }}
                  placeholder="Nombre y apellido"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario-cargo">Cargo <span className="text-destructive">*</span></Label>
                <Select
                  value={formulario.cargo}
                  onValueChange={(cargo) => {
                    setFormulario((actual) => ({ ...actual, cargo }));
                    setErrorFormulario("");
                  }}
                >
                  <SelectTrigger id="usuario-cargo" className="w-full" aria-label="Cargo del usuario">
                    <SelectValue placeholder="Seleccionar cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcionesCargo.map((cargo) => (
                      <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario-area">Área <span className="text-destructive">*</span></Label>
                <Input
                  id="usuario-area"
                  required
                  value={formulario.area}
                  onChange={(event) => {
                    setFormulario((actual) => ({ ...actual, area: event.target.value }));
                    setErrorFormulario("");
                  }}
                  placeholder="Ej. Fábrica"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario-rol">Rol <span className="text-destructive">*</span></Label>
                <Select value={formulario.rol} onValueChange={(rol) => setFormulario((actual) => ({ ...actual, rol: rol as Role }))}>
                  <SelectTrigger id="usuario-rol" className="w-full" aria-label="Rol del usuario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as Role[])
                      .filter((rol) => rol !== "ti" || user.role === "ti")
                      .map((rol) => (
                        <SelectItem key={rol} value={rol}>{ROLE_LABELS[rol]}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario-correo">Correo <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="usuario-correo"
                  type="email"
                  autoComplete="email"
                  value={formulario.correo}
                  onChange={(event) => setFormulario((actual) => ({ ...actual, correo: event.target.value }))}
                  placeholder="nombre@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario-telefono">Número de teléfono <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input
                  id="usuario-telefono"
                  type="tel"
                  autoComplete="tel"
                  value={formulario.telefono}
                  onChange={(event) => setFormulario((actual) => ({ ...actual, telefono: event.target.value }))}
                  placeholder="+595 9xx xxx xxx"
                />
              </div>
            </div>

            {errorFormulario && <p role="alert" className="text-sm text-destructive">{errorFormulario}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => cambiarEditor(false)}>Cancelar</Button>
              <Button type="submit">{usuarioEnEdicion ? "Guardar cambios" : "Crear usuario"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={gestorCargosAbierto} onOpenChange={setGestorCargosAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar cargos</DialogTitle>
            <DialogDescription>
              Lista de cargos disponibles al crear o editar usuarios. Es descriptiva: no otorga permisos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={nuevoCargo}
                onChange={(event) => setNuevoCargo(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    agregarCargo();
                  }
                }}
                placeholder="Nuevo cargo"
                aria-label="Nuevo cargo"
              />
              <Button type="button" className="shrink-0 gap-1.5" onClick={agregarCargo} disabled={!nuevoCargo.trim()}>
                <Plus className="size-4" /> Agregar
              </Button>
            </div>
            <ul className="divide-y rounded-xl border">
              {opcionesCargo.map((cargo) => (
                <li key={cargo} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm">{cargo}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Quitar ${cargo}`}
                    onClick={() => quitarCargo(cargo)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
              {opcionesCargo.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">No hay cargos. Agregá el primero.</li>
              )}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGestorCargosAbierto(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
