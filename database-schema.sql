-- 1대1매치 web launch schema
-- PostgreSQL / Supabase compatible

create table if not exists members (
  id text primary key,
  nickname text not null unique,
  phone text not null unique,
  area text not null,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  created_at timestamptz not null default now()
);

alter table members
  add column if not exists password_hash text;

create table if not exists games (
  id text primary key,
  title text not null,
  summary text not null,
  rules jsonb not null default '[]'::jsonb,
  win_condition text not null,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id text primary key,
  match_date date not null,
  display_date text not null,
  match_time time not null,
  location text not null,
  game_id text references games(id) on update cascade on delete set null,
  game_revealed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_date, match_time, location)
);

create table if not exists applications (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  paid boolean not null default false,
  payment_status text not null default 'payment_pending'
    check (
      payment_status in (
        'payment_pending',
        'paid',
        'refund_requested',
        'refund_scheduled',
        'refunded'
      )
    ),
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists applications_one_active_per_member_match
  on applications (match_id, member_id)
  where cancelled = false;

create index if not exists applications_match_id_idx on applications (match_id);
create index if not exists applications_member_id_idx on applications (member_id);
create index if not exists applications_payment_status_idx on applications (payment_status);

create table if not exists match_results (
  match_id text primary key references matches(id) on delete cascade,
  winner_id text not null references members(id) on delete restrict,
  loser_id text not null references members(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (winner_id <> loser_id)
);

create table if not exists notification_logs (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  message_key text not null,
  sent_at timestamptz not null default now(),
  unique (match_id, message_key)
);

create table if not exists event_logs (
  id text primary key,
  message text not null,
  created_at timestamptz not null default now()
);

create or replace view confirmed_match_roster as
select
  matches.id as match_id,
  matches.display_date,
  matches.match_date,
  matches.match_time,
  matches.location,
  applications.id as application_id,
  applications.payment_status,
  applications.cancelled,
  members.id as member_id,
  members.nickname,
  members.phone,
  members.area
from matches
join applications on applications.match_id = matches.id
join members on members.id = applications.member_id
where applications.cancelled = false
  and applications.payment_status = 'paid';

create or replace view rankings as
select
  id as member_id,
  nickname,
  area,
  wins,
  losses,
  wins + losses as games_played,
  case
    when wins + losses = 0 then 0
    else round((wins::numeric / (wins + losses)::numeric) * 100, 1)
  end as win_rate
from members
order by win_rate desc, wins desc, games_played desc, nickname asc;
