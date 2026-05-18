create table if not exists clientes (
  id uuid primary key,
  nombre varchar(180) not null,
  ruc varchar(40),
  telefono varchar(60),
  email varchar(160),
  direccion text,
  contacto_principal varchar(160),
  estado varchar(30) not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists obras (
  id uuid primary key,
  cliente_id uuid references clientes(id) on delete set null,
  nombre varchar(180) not null,
  ubicacion text,
  responsable varchar(160),
  fecha_inicio date not null,
  fecha_fin_estimada date not null,
  fecha_fin_real date,
  estado varchar(40) not null default 'planificada',
  avance numeric(5,2) not null default 0,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_obras_fechas check (fecha_fin_estimada >= fecha_inicio),
  constraint ck_obras_avance check (avance >= 0 and avance <= 100)
);

create table if not exists tareas_obra (
  id uuid primary key,
  obra_id uuid not null references obras(id) on delete cascade,
  titulo varchar(180) not null,
  descripcion text,
  responsable varchar(160),
  fecha_inicio date not null,
  fecha_fin date not null,
  estado varchar(40) not null default 'pendiente',
  prioridad varchar(30) not null default 'media',
  avance numeric(5,2) not null default 0,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_tareas_obra_fechas check (fecha_fin >= fecha_inicio),
  constraint ck_tareas_obra_avance check (avance >= 0 and avance <= 100)
);

create index if not exists ix_obras_cliente_id on obras(cliente_id);
create index if not exists ix_obras_estado on obras(estado);
create index if not exists ix_tareas_obra_obra_id on tareas_obra(obra_id);
create index if not exists ix_tareas_obra_estado on tareas_obra(estado);
