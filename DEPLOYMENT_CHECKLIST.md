# 1VS1매치 Deployment Checklist

Primary domain:

```text
1x1match.com
```

## Recommended MVP Stack

- Web server: Render, Railway, Fly.io, or another Node.js hosting service
- Database: Supabase PostgreSQL
- Payment: manual bank transfer for MVP
- SMS: manual copy/send for MVP

## Required Environment Variables

```env
ADMIN_PASSWORD=strong-admin-password
HOST=0.0.0.0
PORT=provided-by-host
STORAGE_DRIVER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
PAYMENT_PROVIDER=mock
SMS_PROVIDER=mock
BANK_ACCOUNT_LABEL=bank account label shown to users
```

Most hosting platforms set `PORT` automatically. If they do, do not override it manually.

## Start Command

```bash
npm start
```

## Pre-Launch Checks

- `/api/health` returns `ok: true`
- `/api/state` returns Supabase data
- Signup works with nickname, phone, and main activity area
- Applying shows the bank transfer guide
- Admin can confirm deposits with `입금 확인`
- Two paid participants make a match confirmed
- Admin can copy confirmation/game notice messages manually
- Admin password is not the local default
- `.env.local` and secret keys are not uploaded publicly

## Public Launch Notes

- Use `HOST=0.0.0.0` in production so the hosting platform can route traffic to the server.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in server environment variables.
- Keep manual bank transfer and manual SMS until participant volume justifies paid integrations.
