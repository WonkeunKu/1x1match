create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '""'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function update_site_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists site_settings_updated_at on site_settings;

create trigger site_settings_updated_at
before update on site_settings
for each row
execute function update_site_settings_updated_at();
