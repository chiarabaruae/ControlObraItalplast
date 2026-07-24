-- ============================================================================
-- 019 — Estado "pendiente" de proyecto (dependencia de una acción del cliente)
-- ----------------------------------------------------------------------------
-- Suma el estado "pendiente" al CHECK de `proyectos.estado`. A diferencia de
-- "pausada" (detención por una causa interna), "pendiente" indica que el
-- proyecto está detenido a la espera de una acción del cliente (aprobación,
-- pago o definición). Espeja el modelo del frontend (RegistroPendiente /
-- proyecto.pendientes) manteniendo la paridad 1:1 declarada en D-027.
-- ============================================================================

alter table proyectos
  drop constraint if exists proyectos_estado_check;

alter table proyectos
  add constraint proyectos_estado_check
  check (estado in ('planificada','en_progreso','pausada','pendiente','finalizada','cancelada'));

-- Historial de "pendiente": análogo a `proyecto_pausas`, pero la resolución la
-- destraba el cliente. Cada cambio a "pendiente" exige un motivo.
create table if not exists proyecto_pendientes (
  id                 bigint generated always as identity primary key,
  proyecto_id        uuid not null references proyectos(id) on delete cascade,
  fecha              timestamptz not null default now(),
  usuario_id         uuid references app_users(id),
  motivo             varchar(500) not null,
  resuelta_en        timestamptz,
  resuelta_por_id    uuid references app_users(id),
  motivo_resolucion  varchar(500)
);

create index if not exists ix_proyecto_pendientes on proyecto_pendientes (proyecto_id);
