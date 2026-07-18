import { useState } from "react";
import { Plus, KeyRound, Archive, ArchiveRestore } from "lucide-react";
import { useAuth } from "@/context/auth";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { usuarios as usuariosMock, type Usuario } from "@/mocks/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function Usuarios() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Usuario[]>(usuariosMock);
  if (!user) return null;

  const activos = lista.filter((u) => u.isActive).length;

  const cambiarRol = (u: Usuario, rol: Role) => {
    setLista((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: rol } : x)));
    toast("Rol actualizado", { description: `${u.displayName} → ${ROLE_LABELS[rol]}` });
  };

  const alternarActivo = (u: Usuario) => {
    setLista((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    toast(u.isActive ? "Usuario archivado" : "Usuario reactivado", { description: u.displayName });
  };

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
        <Button className="gap-2" onClick={() => toast("Alta de usuario", { description: "Se conecta al backend en la Fase 4." })}>
          <Plus className="size-4" /> Nuevo usuario
        </Button>
      </header>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((u) => (
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
                        <div className="text-xs text-muted-foreground">{u.positionTitle}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="cifra text-xs">{u.username}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.department}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => cambiarRol(u, v as Role)}>
                      <SelectTrigger size="sm" className="w-36" aria-label={`Rol de ${u.displayName}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="size-7" aria-label={`Resetear contraseña de ${u.displayName}`} onClick={() => toast("Resetear contraseña", { description: "Se conecta al backend en la Fase 4." })}>
                        <KeyRound className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7" aria-label={u.isActive ? `Archivar a ${u.displayName}` : `Reactivar a ${u.displayName}`} onClick={() => alternarActivo(u)}>
                        {u.isActive ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
