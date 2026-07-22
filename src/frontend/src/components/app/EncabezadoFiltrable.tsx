// Encabezado de tabla con ícono de filtro, al estilo de una planilla:
// ordenar A → Z / Z → A y filtrar por los valores de esa columna.
import {
  ArrowDown01, ArrowDown10, ArrowDownAZ, ArrowDownZA,
  CalendarArrowDown, CalendarArrowUp, FilterX, ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ControlTabla, Direccion, TipoColumna } from "@/lib/tabla-filtros";
import { TableHead } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Las opciones de orden se nombran según el dato de la columna: los números
// van por magnitud y las fechas de más reciente a más antigua.
const OPCIONES_ORDEN: Record<
  TipoColumna,
  { direccion: Direccion; etiqueta: string; icono: typeof ArrowDownAZ }[]
> = {
  texto: [
    { direccion: "asc", etiqueta: "Ordenar A → Z", icono: ArrowDownAZ },
    { direccion: "desc", etiqueta: "Ordenar Z → A", icono: ArrowDownZA }
  ],
  numero: [
    { direccion: "asc", etiqueta: "De menor a mayor", icono: ArrowDown01 },
    { direccion: "desc", etiqueta: "De mayor a menor", icono: ArrowDown10 }
  ],
  fecha: [
    { direccion: "desc", etiqueta: "Más recientes primero", icono: CalendarArrowDown },
    { direccion: "asc", etiqueta: "Más antiguas primero", icono: CalendarArrowUp }
  ]
};

export function EncabezadoFiltrable<T>({
  children,
  columna,
  control,
  className,
  alinear = "izquierda"
}: {
  children: React.ReactNode;
  columna: string;
  control: ControlTabla<T>;
  className?: string;
  alinear?: "izquierda" | "derecha" | "centro";
}) {
  const estado = control.estadoColumna(columna);
  const etiqueta = typeof children === "string" ? children : columna;
  const justificado =
    alinear === "derecha" ? "justify-end" : alinear === "centro" ? "justify-center" : "justify-start";

  return (
    <TableHead className={className}>
      <div className={cn("flex items-center gap-1", justificado)}>
        <span>{children}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={`Ordenar y filtrar por ${etiqueta}`}
              aria-label={`Ordenar y filtrar por ${etiqueta}`}
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded transition-colors",
                estado.activo
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              )}
            >
              <ListFilter className="size-3.5" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-60">
            {OPCIONES_ORDEN[estado.tipo].map((opcion) => (
              <DropdownMenuItem
                key={opcion.direccion}
                onClick={() => control.ordenar(columna, opcion.direccion)}
                className={cn(estado.direccion === opcion.direccion && "bg-accent text-accent-foreground")}
              >
                <opcion.icono className="size-4" /> {opcion.etiqueta}
              </DropdownMenuItem>
            ))}

            {estado.disponibles.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="senal senal-muted">Filtrar por valor</DropdownMenuLabel>
                <div className="max-h-56 overflow-y-auto">
                  {estado.disponibles.map((valor) => (
                    <DropdownMenuCheckboxItem
                      key={valor}
                      checked={estado.seleccionados.length === 0 || estado.seleccionados.includes(valor)}
                      onCheckedChange={() => control.alternarValor(columna, valor)}
                      onSelect={(evento) => evento.preventDefault()}
                    >
                      <span className="truncate">{valor}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              </>
            )}

            {estado.activo && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => control.limpiarColumna(columna)}>
                  <FilterX className="size-4" /> Quitar orden y filtro
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );
}

/** Aviso de filtros activos, con acción para volver a ver todo. */
export function AvisoFiltros<T>({ control, unidad = "filas" }: { control: ControlTabla<T>; unidad?: string }) {
  if (!control.hayFiltros) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-primary/[0.04] px-4 py-2 text-xs text-muted-foreground">
      <ListFilter className="size-3.5 text-primary" />
      Mostrando <span className="cifra font-semibold text-foreground">{control.filas.length}</span> de{" "}
      <span className="cifra">{control.total}</span> {unidad}.
      <button
        type="button"
        onClick={control.limpiarTodo}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Quitar filtros
      </button>
    </div>
  );
}
