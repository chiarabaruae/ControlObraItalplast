-- ============================================================================
-- 020 — Capacidad de producción (D-033)
-- ----------------------------------------------------------------------------
-- Topes diarios de aberturas para comparar contra la demanda del cronograma
-- general. La fábrica se topea por línea de producto (PVC y aluminio son
-- líneas distintas); la instalación es un único tope (cuadrillas). Espeja la
-- configuración que el frontend guarda hoy en localStorage
-- (`control-obras-capacidad`), manteniendo la paridad 1:1 de D-027.
-- ============================================================================

-- Tope de instalación: fila única (patrón de `reglas_planificacion`).
create table if not exists capacidad_instalacion (
  id                     integer primary key default 1 check (id = 1),
  aberturas_por_dia      integer not null default 10 check (aberturas_por_dia > 0),
  actualizado_por_id     uuid references app_users(id),
  actualizado_en         timestamptz not null default now()
);

insert into capacidad_instalacion (id, aberturas_por_dia)
values (1, 10)
on conflict (id) do nothing;

-- Tope de fábrica por línea de producto (referencia al catálogo de productos).
create table if not exists capacidad_fabrica (
  tipo_producto          varchar(80) primary key references catalogo_productos(valor) on delete cascade,
  aberturas_por_dia      integer not null check (aberturas_por_dia > 0),
  actualizado_por_id     uuid references app_users(id),
  actualizado_en         timestamptz not null default now()
);
