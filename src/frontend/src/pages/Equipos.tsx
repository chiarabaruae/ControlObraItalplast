import { useState } from "react";
import { Check, HardHat, Factory, Pencil, Plus, Trash2, UserPlus, UsersRound } from "lucide-react";
import {
  guardarEquipos,
  obtenerEquipos,
  TIPO_EQUIPO_LABEL,
  type Equipo,
  type RecursoAdicionalEquipo,
  type TipoEquipo
} from "@/lib/equipos";
import { clientePorId, obtenerProyectos, usuarioPorId, usuarios } from "@/mocks/data";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function nombreUsuario(id: string) {
  return usuarioPorId(id)?.displayName ?? "—";
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        activo ? "border-primary/40 bg-primary/10 text-primary" : "border-input text-muted-foreground hover:text-foreground"
      )}
    >
      {activo && <Check className="size-3" />}
      {children}
    </button>
  );
}

export default function Equipos() {
  const [equipos, setEquipos] = useState<Equipo[]>(() => obtenerEquipos());
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Equipo | null>(null);
  // Alta de recurso adicional dentro del editor.
  const [recursoUsuario, setRecursoUsuario] = useState("");
  const [recursoMotivo, setRecursoMotivo] = useState("");
  const [recursoTipo, setRecursoTipo] = useState<"temporal" | "permanente">("temporal");
  const [recursoHasta, setRecursoHasta] = useState("");

  const personas = usuarios.filter((u) => u.isActive);
  const proyectos = obtenerProyectos();

  const persistir = (lista: Equipo[]) => {
    setEquipos(lista);
    guardarEquipos(lista);
  };

  const limpiarRecurso = () => {
    setRecursoUsuario("");
    setRecursoMotivo("");
    setRecursoTipo("temporal");
    setRecursoHasta("");
  };

  const abrirNuevo = () => {
    setBorrador({ id: `eq-${Date.now()}`, nombre: "", tipo: "obra", encargadoId: "", miembrosIds: [], proyectoIds: [], recursos: [] });
    limpiarRecurso();
    setEditorAbierto(true);
  };

  const abrirEdicion = (equipo: Equipo) => {
    setBorrador({ ...equipo, miembrosIds: [...equipo.miembrosIds], proyectoIds: [...equipo.proyectoIds], recursos: [...equipo.recursos] });
    limpiarRecurso();
    setEditorAbierto(true);
  };

  const eliminar = (equipo: Equipo) => {
    if (!confirm(`¿Eliminar el equipo "${equipo.nombre}"?`)) return;
    persistir(equipos.filter((e) => e.id !== equipo.id));
    toast("Equipo eliminado", { description: equipo.nombre });
  };

  const cambiar = (cambios: Partial<Equipo>) => setBorrador((actual) => (actual ? { ...actual, ...cambios } : actual));

  const toggleEnLista = (clave: "miembrosIds" | "proyectoIds", id: string) =>
    setBorrador((actual) => {
      if (!actual) return actual;
      const lista = actual[clave];
      return { ...actual, [clave]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] };
    });

  const agregarRecurso = () => {
    if (!borrador || !recursoUsuario) return;
    if (!recursoMotivo.trim()) {
      toast("Falta el motivo", { description: "Todo recurso adicional necesita un motivo." });
      return;
    }
    if (recursoTipo === "temporal" && !recursoHasta) {
      toast("Falta la fecha", { description: "Indicá hasta cuándo se suma el recurso." });
      return;
    }
    const recurso: RecursoAdicionalEquipo = {
      usuarioId: recursoUsuario,
      motivo: recursoMotivo.trim(),
      vigencia: recursoTipo === "permanente" ? { tipo: "permanente" } : { tipo: "temporal", hasta: recursoHasta }
    };
    cambiar({ recursos: [...borrador.recursos.filter((r) => r.usuarioId !== recursoUsuario), recurso] });
    limpiarRecurso();
  };

  const quitarRecurso = (usuarioId: string) => {
    if (!borrador) return;
    cambiar({ recursos: borrador.recursos.filter((r) => r.usuarioId !== usuarioId) });
  };

  const guardar = () => {
    if (!borrador) return;
    const nombre = borrador.nombre.trim();
    if (!nombre) {
      toast("Falta el nombre", { description: "El equipo necesita un nombre." });
      return;
    }
    if (!borrador.encargadoId) {
      toast("Falta el encargado", { description: "Asigná un encargado al equipo." });
      return;
    }
    const limpio: Equipo = { ...borrador, nombre };
    const existe = equipos.some((e) => e.id === borrador.id);
    persistir(existe ? equipos.map((e) => (e.id === borrador.id ? limpio : e)) : [...equipos, limpio]);
    setEditorAbierto(false);
    setBorrador(null);
    toast("Equipo guardado", { description: nombre });
  };

  // Recursos que quedan por sumar (no son ya miembros ni recursos).
  const candidatosRecurso = borrador
    ? personas.filter((u) => u.id !== borrador.encargadoId && !borrador.miembrosIds.includes(u.id) && !borrador.recursos.some((r) => r.usuarioId === u.id))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Administración</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Equipos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuadrillas de fábrica y obra. Solo sus integrantes pueden recibir tareas de los proyectos asignados.
          </p>
        </div>
        <Button className="gap-2" onClick={abrirNuevo}>
          <Plus className="size-4" /> Nuevo equipo
        </Button>
      </header>

      {equipos.length === 0 ? (
        <Card className="py-14">
          <CardContent className="text-center text-sm text-muted-foreground">
            No hay equipos. Creá el primero con “Nuevo equipo”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {equipos.map((equipo) => {
            const proyectosEquipo = equipo.proyectoIds
              .map((id) => proyectos.find((p) => p.id === id)?.nombre)
              .filter(Boolean);
            const Icono = equipo.tipo === "fabrica" ? Factory : HardHat;
            return (
              <Card key={equipo.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icono className="size-4.5" strokeWidth={1.75} />
                      </span>
                      <div>
                        <div className="font-heading text-base font-semibold">{equipo.nombre}</div>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {TIPO_EQUIPO_LABEL[equipo.tipo]}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${equipo.nombre}`} onClick={() => abrirEdicion(equipo)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Eliminar ${equipo.nombre}`} onClick={() => eliminar(equipo)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="text-muted-foreground">
                      Encargado: <span className="font-medium text-foreground">{nombreUsuario(equipo.encargadoId)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Miembros: <span className="text-foreground">{equipo.miembrosIds.length}</span>
                      {equipo.recursos.length > 0 && <span> · +{equipo.recursos.length} recurso{equipo.recursos.length === 1 ? "" : "s"}</span>}
                    </div>
                    <div className="text-muted-foreground">
                      Proyectos: {proyectosEquipo.length ? <span className="text-foreground">{proyectosEquipo.join(", ")}</span> : <span>sin asignar</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editorAbierto} onOpenChange={(abierto) => { setEditorAbierto(abierto); if (!abierto) setBorrador(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{borrador && equipos.some((e) => e.id === borrador.id) ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
            <DialogDescription>Definí el equipo, sus integrantes y los proyectos que atiende.</DialogDescription>
          </DialogHeader>

          {borrador && (
            <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="equipo-nombre">Nombre <span className="text-destructive">*</span></Label>
                  <Input id="equipo-nombre" value={borrador.nombre} onChange={(e) => cambiar({ nombre: e.target.value })} placeholder="Ej. Cuadrilla Obra — Zona Norte" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="equipo-tipo">Tipo</Label>
                  <Select value={borrador.tipo} onValueChange={(valor) => cambiar({ tipo: valor as TipoEquipo })}>
                    <SelectTrigger id="equipo-tipo" className="w-full" aria-label="Tipo de equipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="obra">Obra</SelectItem>
                      <SelectItem value="fabrica">Fábrica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="equipo-encargado">Encargado <span className="text-destructive">*</span></Label>
                  <Select value={borrador.encargadoId} onValueChange={(valor) => cambiar({ encargadoId: valor })}>
                    <SelectTrigger id="equipo-encargado" className="w-full" aria-label="Encargado del equipo">
                      <SelectValue placeholder="Elegí un encargado" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Miembros</Label>
                <div className="flex flex-wrap gap-1.5">
                  {personas.filter((u) => u.id !== borrador.encargadoId).map((u) => (
                    <Chip key={u.id} activo={borrador.miembrosIds.includes(u.id)} onClick={() => toggleEnLista("miembrosIds", u.id)}>
                      {u.displayName}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Proyectos asignados</Label>
                {proyectos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No hay proyectos todavía.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {proyectos.map((p) => (
                      <Chip key={p.id} activo={borrador.proyectoIds.includes(p.id)} onClick={() => toggleEnLista("proyectoIds", p.id)}>
                        {p.nombre}
                        <span className="text-[10px] opacity-70">· {clientePorId(p.clienteId)?.nombre ?? "—"}</span>
                      </Chip>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Al asignar un proyecto, solo este equipo (y sus recursos) podrá recibir tareas de ese proyecto.
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <h4 className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <UserPlus className="size-4 text-primary" /> Recursos adicionales
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Personas de afuera del equipo que se suman con un motivo y una vigencia.
                </p>

                {borrador.recursos.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {borrador.recursos.map((r) => (
                      <li key={r.usuarioId} className="flex items-center gap-2 rounded-lg border p-2.5">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium">{nombreUsuario(r.usuarioId)}</span>
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {r.vigencia.tipo === "permanente" ? "Permanente" : `Hasta ${formatFecha(r.vigencia.hasta)}`}
                          </span>
                          <p className="truncate text-xs text-muted-foreground">Motivo: {r.motivo}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Quitar ${nombreUsuario(r.usuarioId)}`} onClick={() => quitarRecurso(r.usuarioId)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Select value={recursoUsuario} onValueChange={setRecursoUsuario}>
                    <SelectTrigger className="w-full" aria-label="Persona a sumar como recurso">
                      <SelectValue placeholder="Persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidatosRecurso.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={recursoTipo} onValueChange={(valor) => setRecursoTipo(valor as "temporal" | "permanente")}>
                    <SelectTrigger className="w-full" aria-label="Vigencia del recurso">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="temporal">Temporal</SelectItem>
                      <SelectItem value="permanente">Permanente</SelectItem>
                    </SelectContent>
                  </Select>
                  {recursoTipo === "temporal" && (
                    <Input type="date" value={recursoHasta} onChange={(e) => setRecursoHasta(e.target.value)} aria-label="Rige hasta" />
                  )}
                  <Input value={recursoMotivo} onChange={(e) => setRecursoMotivo(e.target.value)} placeholder="Motivo" className={recursoTipo === "temporal" ? "" : "sm:col-span-1"} />
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="button" variant="outline" className="gap-1.5" onClick={agregarRecurso} disabled={!recursoUsuario || !recursoMotivo.trim()}>
                      <Plus className="size-4" /> Sumar recurso
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditorAbierto(false); setBorrador(null); }}>Cancelar</Button>
            <Button className="gap-2" onClick={guardar}><UsersRound className="size-4" /> Guardar equipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
