alter table games
  add column if not exists category text not null default 'uncategorized',
  add column if not exists is_hidden boolean not null default false;

