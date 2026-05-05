alter table app_users
  add column if not exists document_number varchar(20),
  add column if not exists business_unit varchar(80),
  add column if not exists department varchar(80),
  add column if not exists schedule_type varchar(80),
  add column if not exists position_title varchar(160);

create unique index if not exists ux_app_users_document_number
  on app_users (document_number)
  where document_number is not null;
