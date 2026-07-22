import { Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { useAuth } from "@/context/auth";
import { permisos } from "@/lib/roles";
import { useTablaFiltrable } from "@/lib/tabla-filtros";
import { clientes } from "@/mocks/data";
import { AvisoFiltros, EncabezadoFiltrable } from "@/components/app/EncabezadoFiltrable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function Clientes() {
  const { user } = useAuth();
  const tabla = useTablaFiltrable(clientes, {
    cliente: (c) => c.nombre,
    ruc: (c) => c.ruc,
    contacto: (c) => c.contacto,
    proyectos: { valor: (c) => String(c.proyectos), orden: (c) => c.proyectos, tipo: "numero" },
    estado: (c) => (c.estado === "activo" ? "Activo" : "Inactivo")
  });
  if (!user) return null;

  const gestiona = permisos.gestionarClientes(user.role);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="senal">Comercial</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Clientes</h1>
          {!gestiona && (
            <p className="mt-1 text-sm text-muted-foreground">
              Solo lectura: datos de contacto para coordinar en obra.
            </p>
          )}
        </div>
        {gestiona && (
          <Button className="gap-2" onClick={() => toast("Nuevo cliente", { description: "Se conecta al backend en la Fase 4." })}>
            <Plus className="size-4" /> Nuevo cliente
          </Button>
        )}
      </header>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <EncabezadoFiltrable columna="cliente" control={tabla}>Cliente</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="ruc" control={tabla}>RUC</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="contacto" control={tabla}>Contacto</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="proyectos" control={tabla} alinear="derecha">Proyectos</EncabezadoFiltrable>
                <EncabezadoFiltrable columna="estado" control={tabla}>Estado</EncabezadoFiltrable>
                {gestiona && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabla.filas.map((c) => (
                <TableRow key={c.id} className={c.estado === "inactivo" ? "opacity-55" : ""}>
                  <TableCell>
                    <div className="font-medium">{c.nombre}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Phone className="size-3" /> {c.telefono}</span>
                      <span className="flex items-center gap-1"><Mail className="size-3" /> {c.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="cifra text-xs">{c.ruc}</TableCell>
                  <TableCell className="text-sm">{c.contacto}</TableCell>
                  <TableCell className="cifra text-right">{c.proyectos}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      c.estado === "activo" ? "bg-estado-progreso/12 text-estado-progreso" : "bg-muted text-muted-foreground"
                    }`}>
                      {c.estado === "activo" ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  {gestiona && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" aria-label={`Editar ${c.nombre}`} onClick={() => toast("Editar cliente", { description: "Se conecta al backend en la Fase 4." })}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={`Eliminar ${c.nombre}`} onClick={() => toast("Eliminar cliente", { description: "Se conecta al backend en la Fase 4." })}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {tabla.filas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ningún cliente coincide con el filtro aplicado.
            </p>
          )}
          <AvisoFiltros control={tabla} unidad="clientes" />
        </CardContent>
      </Card>
    </div>
  );
}
