-- Add exact venue storage for confirmed match notices.
-- Safe to run multiple times.

alter table if exists matches
  add column if not exists exact_venue text not null default '';
