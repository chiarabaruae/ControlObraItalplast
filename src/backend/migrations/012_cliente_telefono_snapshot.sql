alter table obras
  add column if not exists cliente_telefono_snapshot text;

create index if not exists ix_obras_cliente_telefono_snapshot on obras(cliente_telefono_snapshot);
