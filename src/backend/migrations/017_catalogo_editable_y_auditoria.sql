-- ============================================================================
-- D-029 — Catálogo editable para todos los productos (estándar incluidos):
-- etapas opcionales configurables por grupo y auditoría silenciosa de cambios.
-- ============================================================================

-- Etapas opcionales por grupo: reemplazan al flag único lleva_premarcos
-- (que se conserva por compatibilidad y como resumen).
alter table catalogo_productos
  add column if not exists lleva_fabricacion_premarcos boolean,
  add column if not exists lleva_instalacion_premarcos boolean;

update catalogo_productos
   set lleva_fabricacion_premarcos = coalesce(lleva_fabricacion_premarcos, lleva_premarcos),
       lleva_instalacion_premarcos = coalesce(lleva_instalacion_premarcos, lleva_premarcos);

alter table catalogo_productos
  alter column lleva_fabricacion_premarcos set not null,
  alter column lleva_instalacion_premarcos set not null;

-- Auditoría del catálogo: cada alta, edición, baja o reactivación queda
-- sellada con fecha, usuario y detalle. Solo datos; ninguna pantalla la muestra.
create table if not exists catalogo_auditoria (
  id          bigint generated always as identity primary key,
  fecha       timestamptz not null default now(),
  usuario_id  uuid references app_users(id),
  accion      varchar(20) not null check (accion in ('crear','editar','desactivar','reactivar')),
  valor       varchar(80) not null,                 -- slug del producto afectado
  detalle     jsonb                                  -- cambios aplicados (antes/después)
);

create index if not exists ix_catalogo_auditoria_valor on catalogo_auditoria (valor);
