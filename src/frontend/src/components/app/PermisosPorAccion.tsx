import { useEffect, useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import {
  ACCIONES_OTORGABLES,
  LABEL_ACCION,
  accionesOtorgablesPara,
  guardarOverrides,
  obtenerOverrides,
  overrideVigente,
  type AccionOtorgable,
  type PermisoOverride
} from "@/lib/permisos-usuario";
import { ROLE_LABELS } from "@/lib/roles";
import { formatFecha } from "@/lib/format";
import type { Usuario } from "@/mocks/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const DESCRIPCION_ACCION = Object.fromEntries(
  ACCIONES_OTORGABLES.map((a) => [a.clave, a.descripcion])
) as Record<AccionOtorgable, string>;

export function PermisosPorAccion({ usuarios, otorganteId }: { usuarios: Usuario[]; otorganteId: string }) {
  const candidatos = usuarios.filter((u) => u.isActive && u.role !== "ti");
  const [usuarioId, setUsuarioId] = useState(candidatos[0]?.id ?? "");
  const usuarioSel = candidatos.find((u) => u.id === usuarioId) ?? null;

  const [overrides, setOverrides] = useState<PermisoOverride[]>(() => (usuarioId ? obtenerOverrides(usuarioId) : []));
  const [accion, setAccion] = useState<AccionOtorgable | "">("");
  const [motivo, setMotivo] = useState("");
  const [vigenciaTipo, setVigenciaTipo] = useState<"temporal" | "permanente">("temporal");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    setOverrides(usuarioId ? obtenerOverrides(usuarioId) : []);
    setAccion("");
    setMotivo("");
    setHasta("");
    setVigenciaTipo("temporal");
  }, [usuarioId]);

  const persistir = (lista: PermisoOverride[]) => {
    setOverrides(lista);
    if (usuarioSel) guardarOverrides(usuarioSel.id, lista);
  };

  // Solo se ofrecen acciones que el rol todavía no tiene y que no estén ya otorgadas.
  const yaOtorgadas = new Set(overrides.map((o) => o.accion));
  const disponibles = usuarioSel
    ? accionesOtorgablesPara(usuarioSel.role).filter((a) => !yaOtorgadas.has(a))
    : [];

  const agregar = () => {
    if (!usuarioSel || !accion) return;
    if (!motivo.trim()) {
      toast("Falta el motivo", { description: "Toda excepción necesita un motivo para la auditoría." });
      return;
    }
    if (vigenciaTipo === "temporal" && !hasta) {
      toast("Falta la fecha", { description: "Indicá hasta cuándo rige la excepción temporal." });
      return;
    }
    const nueva: PermisoOverride = {
      accion,
      motivo: motivo.trim(),
      vigencia: vigenciaTipo === "permanente" ? { tipo: "permanente" } : { tipo: "temporal", hasta },
      otorgadoPorId: otorganteId,
      otorgadoEn: new Date().toISOString()
    };
    persistir([...overrides.filter((o) => o.accion !== accion), nueva]);
    setAccion("");
    setMotivo("");
    setHasta("");
    toast("Excepción otorgada", { description: `${LABEL_ACCION[accion]} para ${usuarioSel.displayName}.` });
  };

  const quitar = (objetivo: AccionOtorgable) => {
    persistir(overrides.filter((o) => o.accion !== objetivo));
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <div>
            <CardTitle>Permisos por acción</CardTitle>
            <CardDescription>
              Excepciones que suman permisos sobre el rol de una persona, con motivo y vigencia. Nunca quitan lo que el rol ya permite.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="permisos-usuario">Persona</Label>
          <Select value={usuarioId} onValueChange={setUsuarioId}>
            <SelectTrigger id="permisos-usuario" className="w-full sm:w-80" aria-label="Persona">
              <SelectValue placeholder="Elegí una persona" />
            </SelectTrigger>
            <SelectContent>
              {candidatos.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.displayName} · {ROLE_LABELS[u.role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {usuarioSel && (
          <>
            <div>
              <h4 className="font-heading text-sm font-semibold">Excepciones vigentes</h4>
              {overrides.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Sin excepciones. {usuarioSel.displayName} solo tiene los permisos de su rol ({ROLE_LABELS[usuarioSel.role]}).
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {overrides.map((o) => {
                    const vigente = overrideVigente(o);
                    return (
                      <li key={o.accion} className="flex items-center gap-3 rounded-xl border p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{LABEL_ACCION[o.accion]}</span>
                            {o.vigencia.tipo === "permanente" ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Permanente</span>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${vigente ? "bg-estado-pausada/14 text-estado-pausada" : "bg-estado-riesgo/12 text-estado-riesgo"}`}>
                                {vigente ? `Temporal · hasta ${formatFecha(o.vigencia.hasta)}` : `Vencida · ${formatFecha(o.vigencia.hasta)}`}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">Motivo: {o.motivo}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => quitar(o.accion)}
                          aria-label={`Quitar excepción ${LABEL_ACCION[o.accion]}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border p-4">
              <h4 className="font-heading text-sm font-semibold">Otorgar una excepción</h4>
              {disponibles.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No quedan acciones para otorgar: su rol ya cubre el resto o ya están otorgadas.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="permisos-accion">Acción</Label>
                      <Select value={accion} onValueChange={(valor) => setAccion(valor as AccionOtorgable)}>
                        <SelectTrigger id="permisos-accion" className="w-full" aria-label="Acción a otorgar">
                          <SelectValue placeholder="Elegí una acción" />
                        </SelectTrigger>
                        <SelectContent>
                          {disponibles.map((a) => (
                            <SelectItem key={a} value={a}>{LABEL_ACCION[a]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {accion && <p className="text-xs text-muted-foreground">{DESCRIPCION_ACCION[accion]}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="permisos-vigencia">Vigencia</Label>
                      <Select value={vigenciaTipo} onValueChange={(valor) => setVigenciaTipo(valor as "temporal" | "permanente")}>
                        <SelectTrigger id="permisos-vigencia" className="w-full" aria-label="Vigencia">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="temporal">Temporal (hasta una fecha)</SelectItem>
                          <SelectItem value="permanente">Permanente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {vigenciaTipo === "temporal" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="permisos-hasta">Rige hasta</Label>
                        <Input id="permisos-hasta" type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} />
                      </div>
                    )}
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="permisos-motivo">Motivo <span className="text-destructive">*</span></Label>
                      <Input id="permisos-motivo" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej.: cubre a M. Fleitas esta semana" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" className="gap-1.5" onClick={agregar} disabled={!accion || !motivo.trim()}>
                      <Plus className="size-4" /> Otorgar excepción
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Cada cambio queda registrado (quién y cuándo) para auditoría. Las excepciones no se ven para la persona; solo amplían lo que puede hacer.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
