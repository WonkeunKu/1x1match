# Supabase Game Admin Migration

운영관리의 게임 추가/수정/숨김 기능은 `games` 테이블에 아래 컬럼이 있어야 완전히 저장됩니다.

```sql
alter table games
  add column if not exists category text not null default 'uncategorized',
  add column if not exists is_hidden boolean not null default false;
```

같은 내용은 `supabase-add-game-admin-fields.sql`에도 들어 있습니다.

적용 후 확인할 것:

1. 운영관리에서 게임 1개를 숨김 처리합니다.
2. 새로고침 후 숨김 상태가 유지되는지 확인합니다.
3. 게임 목록에서 해당 게임이 일반 사용자에게 보이지 않는지 확인합니다.
4. 운영관리에서 복구 후 다시 일반 목록에 보이는지 확인합니다.

컬럼이 적용되지 않아도 기존 게임 목록과 매치 운영은 계속 동작하지만, 게임 분류 변경과 숨김 상태는 Supabase에 영구 저장되지 않습니다.
