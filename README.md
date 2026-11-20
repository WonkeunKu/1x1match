# 1x1 MATCH

야구 지식으로 겨루는 두뇌 게임 모음 사이트입니다.

- `/` 첫 화면
- `/auction/online/` 연봉 블라인드 경매 (온라인 4인, 각자 폰)
- `/auction/ai/` 연봉 블라인드 경매 (AI 대전, 나 + AI 3명)
- `/blackwhite/online/` 9이닝 홈런 흑과 백 (온라인 1:1, 사람 대전)
- `/blackwhite/` 9이닝 홈런 흑과 백 (AI 대전)

## Start

```bash
npm start
```

의존성이 없는 정적 서버(`server.mjs`)입니다. `PORT`, `HOST` 환경 변수를 따르고, `/api/health`는 `{ "ok": true }`를 돌려줍니다.

회원 기능은 Supabase가 필요해요: `supabase-setup.sql`을 SQL Editor에서 한 번 실행하고, 서버 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 넣으세요. (선택) `SESSION_SECRET`.

이전 1VS1매치 신청/운영 서비스 코드는 `legacy-1vs1match` 브랜치에 그대로 남아 있습니다.
