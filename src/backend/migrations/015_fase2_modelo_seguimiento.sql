-- ============================================================================
-- Fase 2 — Modelo de seguimiento con terminología vigente (React frontend).
-- Coexiste con las tablas legadas (obras, aberturas_proyecto, avance_*), que
-- quedan para migrar datos y retirar después. Espeja el modelo del frontend:
-- src/frontend/src/mocks/data.ts  (D-021, D-022, D-023, D-024, D-025, D-026)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catálogo de productos (D-025): estándar + personalizados por administración.
-- El slug es la clave que referencia el resto del modelo (estable ante renombres).
-- ----------------------------------------------------------------------------
create table if not exists catalogo_productos (
  valor            varchar(80) primary key,          -- slug: "aberturas_pvc", "aberturas_de_madera"
  label            varchar(160) not null,
  nombre_corto     varchar(60),                      -- "PVC", "Aluminio"; null => usar label
  lleva_premarcos  boolean not null default true,
  es_base          boolean not null default false,   -- estándar: no eliminable
  activo           boolean not null default true,    -- baja lógica de personalizados
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

insert into catalogo_productos (valor, label, nombre_corto, lleva_premarcos, es_base) values
  ('aberturas_aluminio', 'Aberturas de aluminio', 'Aluminio', true,  true),
  ('aberturas_pvc',      'Aberturas de PVC',      'PVC',      true,  true),
  ('mosquiteras',        'Mosquiteras',           null,       true,  true),
  ('persianas',          'Persianas',             null,       true,  true),
  ('aberturas_velux',    'Aberturas Velux de techo', 'Velux', true,  true),
  ('servicios',          'Servicios',             null,       false, true)
on conflict (valor) do nothing;

-- ----------------------------------------------------------------------------
-- Reglas de planificación backward (D-023): brechas globales editables.
-- Fila única (id = 1); el historial de cambios queda en auditoría futura.
-- ----------------------------------------------------------------------------
create table if not exists reglas_planificacion (
  id                             smallint primary key default 1 check (id = 1),
  dias_produccion_a_instalacion  integer not null default 3 check (dias_produccion_a_instalacion >= 0),
  dias_abaco_a_fabrica           integer not null default 1 check (dias_abaco_a_fabrica >= 0),
  dias_premarcos_a_abaco         integer not null default 3 check (dias_premarcos_a_abaco >= 0),
  actualizado_en                 timestamptz not null default now(),
  actualizado_por_id             uuid references app_users(id)
);

insert into reglas_planificacion (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Proyectos Fase 2 (reemplaza conceptualmente a "obras").
-- ----------------------------------------------------------------------------
create table if not exists proyectos (
  id                uuid primary key,
  nombre            varchar(200) not null,
  cliente_id        uuid references clientes(id),
  direccion         varchar(300),
  descripcion       text,
  lider_usuario_id  uuid references app_users(id),
  estado            varchar(20) not null default 'planificada'
                    check (estado in ('planificada','en_progreso','pausada','finalizada','cancelada')),
  fecha_inicio      date,
  fecha_fin         date,
  creado_por_id     uuid references app_users(id),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

create index if not exists ix_proyectos_estado on proyectos (estado);
create index if not exists ix_proyectos_cliente on proyectos (cliente_id);

-- ----------------------------------------------------------------------------
-- Productos del proyecto (D-005) + planificación backward por producto (D-023).
-- ----------------------------------------------------------------------------
create table if not exists proyecto_productos (
  proyecto_id               uuid not null references proyectos(id) on delete cascade,
  tipo_producto             varchar(80) not null references catalogo_productos(valor),
  fabricara_premarcos       boolean not null default false,
  instalara_premarcos       boolean not null default false,
  -- Planificación backward (todo opcional; sin ancla no se estiman fechas):
  fecha_inicio_instalacion  date,
  dias_instalacion          integer check (dias_instalacion > 0),
  dias_fabrica              integer check (dias_fabrica > 0),
  dias_fabricacion_premarcos integer check (dias_fabricacion_premarcos > 0),
  dias_instalacion_premarcos integer check (dias_instalacion_premarcos > 0),
  primary key (proyecto_id, tipo_producto)
);

-- ----------------------------------------------------------------------------
-- Etapas por producto y grupo (D-006/D-007): editables por proyecto.
-- ----------------------------------------------------------------------------
create table if not exists proyecto_etapas (
  id             uuid primary key,
  proyecto_id    uuid not null references proyectos(id) on delete cascade,
  tipo_producto  varchar(80) not null references catalogo_productos(valor),
  grupo          varchar(30) not null
                 check (grupo in ('fabricacion_premarcos','instalacion_premarcos','fabrica','instalacion')),
  nombre         varchar(160) not null,
  orden          integer not null default 0
);

create index if not exists ix_proyecto_etapas on proyecto_etapas (proyecto_id, tipo_producto, grupo, orden);

-- ----------------------------------------------------------------------------
-- Presupuesto ejecutivo (D-009) y sus componentes verificados (D-010).
-- El PDF se versiona: el vigente es el de mayor "revision".
-- ----------------------------------------------------------------------------
create table if not exists presupuestos_ejecutivos (
  id               uuid primary key,
  proyecto_id      uuid not null references proyectos(id) on delete cascade,
  nombre_archivo   varchar(300) not null,
  formato_detectado varchar(60),                    -- tabla_excel | preference | preference_mercosul | manual
  revision         integer not null default 1,
  ruta_archivo     text,                            -- almacenamiento en disco/objeto; null en cargas manuales
  subido_por_id    uuid references app_users(id),
  subido_en        timestamptz not null default now(),
  unique (proyecto_id, revision)
);

create table if not exists presupuesto_items (
  id              uuid primary key,
  presupuesto_id  uuid not null references presupuestos_ejecutivos(id) on delete cascade,
  posicion        integer,
  codigo          varchar(60),
  ambiente        varchar(200),
  cantidad        integer not null default 1 check (cantidad > 0),
  ancho_mm        integer,
  alto_mm         integer,
  descripcion     text,
  serie           varchar(120),
  color           varchar(120),
  vidrio_detalle  varchar(200),
  tipo_producto   varchar(80) not null references catalogo_productos(valor)
);

create index if not exists ix_presupuesto_items on presupuesto_items (presupuesto_id);

-- ----------------------------------------------------------------------------
-- Evidencias (D-011): archivo auditable, no blob en el navegador.
-- ----------------------------------------------------------------------------
create table if not exists evidencias (
  id             uuid primary key,
  proyecto_id    uuid not null references proyectos(id) on delete cascade,
  ruta_archivo   text not null,
  mime           varchar(100) not null default 'image/jpeg',
  subida_por_id  uuid references app_users(id),
  subida_en      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tareas de seguimiento (D-011/D-014/D-021/D-022/D-026):
-- una por componente × etapa (o manual), con prioridad, auditoría y borrado lógico.
-- ----------------------------------------------------------------------------
create table if not exists tareas_seguimiento (
  id                 uuid primary key,
  proyecto_id        uuid not null references proyectos(id) on delete cascade,
  item_id            uuid references presupuesto_items(id) on delete set null,
  tipo_producto      varchar(80) not null references catalogo_productos(valor),
  grupo              varchar(30) not null
                     check (grupo in ('fabricacion_premarcos','instalacion_premarcos','fabrica','instalacion')),
  etapa              varchar(160) not null,
  titulo             varchar(300),                  -- null => derivar de etapa + código del ítem
  fecha_inicio       date,
  fecha_fin          date,
  manual             boolean not null default false,
  prioridad          varchar(10) not null default 'media'
                     check (prioridad in ('baja','media','alta','urgente')),
  completada         boolean not null default false,
  completada_en      timestamptz,
  completada_por_id  uuid references app_users(id),
  -- Asignación operativa: el responsable ejecuta y el asignador queda visible.
  responsable_id     uuid references app_users(id),
  asignada_por_id    uuid references app_users(id),
  asignada_en        timestamptz,
  observaciones      text,
  evidencia_id       uuid references evidencias(id),
  -- Auditoría (D-021):
  creada_en          timestamptz not null default now(),
  creada_por_id      uuid references app_users(id),
  version            integer not null default 1,
  modificada_en      timestamptz,
  modificada_por_id  uuid references app_users(id),
  -- Borrado lógico (D-021): ninguna interfaz muestra tareas eliminadas.
  eliminada_en       timestamptz,
  eliminada_por_id   uuid references app_users(id),
  check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio),
  check (not completada or evidencia_id is not null)   -- completar exige evidencia
);

create index if not exists ix_tareas_proyecto on tareas_seguimiento (proyecto_id) where eliminada_en is null;
create index if not exists ix_tareas_pendientes on tareas_seguimiento (proyecto_id, completada) where eliminada_en is null;

create index if not exists ix_tareas_responsable on tareas_seguimiento (responsable_id)
  where eliminada_en is null;

create table if not exists tarea_modificaciones (
  id          bigint generated always as identity primary key,
  tarea_id    uuid not null references tareas_seguimiento(id) on delete cascade,
  fecha       timestamptz not null default now(),
  usuario_id  uuid references app_users(id),
  resumen     varchar(300) not null
);

create index if not exists ix_tarea_modificaciones on tarea_modificaciones (tarea_id);

create table if not exists tarea_asignaciones (
  id             bigint generated always as identity primary key,
  tarea_id       uuid not null references tareas_seguimiento(id) on delete cascade,
  fecha          timestamptz not null default now(),
  asignado_por_id uuid references app_users(id),
  responsable_id uuid references app_users(id),
  resumen        varchar(300) not null
);

create index if not exists ix_tarea_asignaciones on tarea_asignaciones (tarea_id, fecha desc);

create table if not exists tarea_reaperturas (
  id          bigint generated always as identity primary key,
  tarea_id    uuid not null references tareas_seguimiento(id) on delete cascade,
  fecha       timestamptz not null default now(),
  usuario_id  uuid references app_users(id),
  motivo      varchar(500) not null                  -- obligatorio para todos los roles (D-021)
);

create index if not exists ix_tarea_reaperturas on tarea_reaperturas (tarea_id);

-- ----------------------------------------------------------------------------
-- Transiciones de estado del proyecto (D-015/D-017).
-- ----------------------------------------------------------------------------
create table if not exists proyecto_historial_estados (
  id          bigint generated always as identity primary key,
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  fecha       timestamptz not null default now(),
  usuario_id  uuid references app_users(id),
  origen      varchar(20) not null,
  destino     varchar(20) not null,
  motivo      varchar(500)
);

create index if not exists ix_historial_estados on proyecto_historial_estados (proyecto_id);

create table if not exists proyecto_pausas (
  id                  bigint generated always as identity primary key,
  proyecto_id         uuid not null references proyectos(id) on delete cascade,
  fecha               timestamptz not null default now(),
  usuario_id          uuid references app_users(id),
  motivo              varchar(500) not null,
  reanudada_en        timestamptz,
  reanudada_por_id    uuid references app_users(id),
  motivo_reanudacion  varchar(500)
);

create table if not exists proyecto_cierres (
  proyecto_id           uuid primary key references proyectos(id) on delete cascade,
  fecha                 timestamptz not null default now(),
  usuario_id            uuid references app_users(id),
  observacion           varchar(500),
  evidencia_general_id  uuid references evidencias(id)
);

create table if not exists proyecto_cancelaciones (
  id                   bigint generated always as identity primary key,
  proyecto_id          uuid not null references proyectos(id) on delete cascade,
  fecha                timestamptz not null default now(),
  usuario_id           uuid references app_users(id),
  motivo               varchar(500) not null,
  reactivada_en        timestamptz,
  reactivada_por_id    uuid references app_users(id),
  motivo_reactivacion  varchar(500)
);
