create table if not exists relaciones_clientes_proyectos (
  id uuid primary key,
  cliente_externo_id text not null,
  cliente_nombre_normalizado text,
  proyecto_id uuid not null references obras(id) on delete cascade,
  estado_relacion text not null default 'confirmado',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint ck_relacion_estado check (estado_relacion in ('confirmado', 'sugerido', 'rechazado'))
);

create unique index if not exists ux_relaciones_cliente_proyecto
  on relaciones_clientes_proyectos(cliente_externo_id, proyecto_id);

create index if not exists ix_relaciones_cliente_estado
  on relaciones_clientes_proyectos(cliente_externo_id, estado_relacion);

create index if not exists ix_relaciones_proyecto
  on relaciones_clientes_proyectos(proyecto_id);
