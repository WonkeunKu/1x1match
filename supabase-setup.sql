-- 1x1 MATCH 회원·경기 기록 테이블 (Supabase SQL Editor에서 한 번 실행)
-- 예전 1VS1매치 테이블(members 등)과 이름이 겹치지 않게 match_ 로 시작해요.

create table if not exists match_users (
  id bigserial primary key,
  nickname text not null unique,
  name text not null,
  phone text not null unique,          -- 숫자만 저장 (예: 01012345678). 전화번호 하나당 계정 하나
  pw_hash text not null,               -- scrypt 해시. 비밀번호 원문은 저장하지 않음
  created_at timestamptz not null default now()
);

create table if not exists match_history (
  id bigserial primary key,
  user_id bigint not null references match_users(id) on delete cascade,
  game text not null,                  -- auction | bw
  mode text not null,                  -- online | ai
  level text,                          -- low | mid | high (AI 대전)
  result jsonb not null,               -- 순위·점수·상대 등 화면에 보여줄 내용
  played_at timestamptz not null default now()
);
create index if not exists match_history_user_idx on match_history (user_id, played_at desc);

-- 브라우저(anon 키)에서는 직접 못 읽고 못 쓰게 막아 둠. 서버는 service_role 키로 접근해요.
alter table match_users enable row level security;
alter table match_history enable row level security;
