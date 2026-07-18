alter table obras
  add column if not exists fecha_firma_abaco date,
  add column if not exists etiquetas jsonb not null default '[]'::jsonb;
