-- Fase 2.1 — asignación operativa y archivo administrativo de tareas.
-- Es idempotente para instalaciones que ya ejecutaron 015.

alter table if exists tareas_seguimiento
  add column if not exists responsable_id  uuid references app_users(id),
  add column if not exists asignada_por_id uuid references app_users(id),
  add column if not exists asignada_en     timestamptz;

create index if not exists ix_tareas_responsable on tareas_seguimiento (responsable_id)
  where eliminada_en is null;

create table if not exists tarea_asignaciones (
  id              bigint generated always as identity primary key,
  tarea_id        uuid not null references tareas_seguimiento(id) on delete cascade,
  fecha           timestamptz not null default now(),
  asignado_por_id uuid references app_users(id),
  responsable_id  uuid references app_users(id),
  resumen         varchar(300) not null
);

create index if not exists ix_tarea_asignaciones on tarea_asignaciones (tarea_id, fecha desc);
