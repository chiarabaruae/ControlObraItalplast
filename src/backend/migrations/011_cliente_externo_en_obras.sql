alter table obras
  add column if not exists cliente_externo_id text,
  add column if not exists cliente_nombre_snapshot text,
  add column if not exists cliente_ruc_snapshot text,
  add column if not exists cliente_origen text default 'leads',
  add column if not exists oferta_nro varchar(80),
  add column if not exists serie varchar(160),
  add column if not exists total_aberturas integer not null default 0,
  add column if not exists observaciones text;

update obras o
set
  cliente_nombre_snapshot = coalesce(o.cliente_nombre_snapshot, c.nombre),
  cliente_ruc_snapshot = coalesce(o.cliente_ruc_snapshot, c.ruc)
from clientes c
where o.cliente_id = c.id;

update obras
set cliente_origen = 'leads'
where cliente_origen is null or trim(cliente_origen) = '';

create index if not exists ix_obras_cliente_externo_id on obras(cliente_externo_id);
create index if not exists ix_obras_cliente_origen on obras(cliente_origen);
