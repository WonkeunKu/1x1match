alter table matches
  add column if not exists admin_note text not null default '';
