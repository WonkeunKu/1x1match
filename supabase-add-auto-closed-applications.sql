alter table applications
  add column if not exists auto_closed boolean not null default false;
