create table if not exists app_users (
  id uuid primary key,
  username varchar(80) not null unique,
  display_name varchar(160) not null,
  password_hash text not null,
  role varchar(40) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_app_users_username_lower
  on app_users (lower(username));
