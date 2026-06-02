# 1대1매치 Web Launch Notes

Primary domain:

```text
1x1match.com
```

## Admin password

Set an environment variable before launching the server:

```powershell
$env:ADMIN_PASSWORD="your-strong-admin-password"
npm start
```

If `ADMIN_PASSWORD` is not set, the local development password is `mindmatch-admin`.

## Server host and port

Local development uses:

```env
HOST=127.0.0.1
PORT=4174
```

Production hosting should use `HOST=0.0.0.0`. Most services provide `PORT` automatically.

Health check:

```text
/api/health
```

## Local data

Prototype data is stored in `app-data.json`. For real launch, move this data to a managed database before accepting public users.

The server currently uses `STORAGE_DRIVER=json`, which keeps the prototype behavior. Change this only after the production database is ready.

## Database transition

Use `database-schema.sql` as the first Supabase/PostgreSQL schema. The migration checklist is in `DB_MIGRATION_PLAN.md`.

Recommended order:

1. Create Supabase project.
2. Run `database-schema.sql`.
3. Set `STORAGE_DRIVER=supabase`.
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
5. Restart the server and confirm `/api/state` responds.
6. Connect real payment and SMS providers after database persistence is stable.

The storage adapter is separated in `storage.mjs`. Keep the service role key on the server only; never expose it in browser JavaScript.

## Local Supabase connection

Create `.env.local` from `.env.local.example`, then paste the secret key into `SUPABASE_SERVICE_ROLE_KEY`.

```env
ADMIN_PASSWORD=your-strong-admin-password
STORAGE_DRIVER=supabase
SUPABASE_URL=https://wjwwembdvoymfbynywtq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
```

`.env.local` is ignored by `.gitignore` because it contains private credentials.

To seed Supabase with the current prototype data:

```powershell
node migrate-json-to-supabase.mjs
```

## Payment and SMS

The server currently uses safe mock providers:

```env
PAYMENT_PROVIDER=mock
SMS_PROVIDER=mock
```

Mock payment marks the 1,000 KRW participation fee as captured without moving real money. Mock SMS records the same server flow without sending real text messages. Replace these providers only after choosing real vendors.

## Manual Bank Transfer MVP

For the first launch, use manual bank transfer instead of a payment gateway:

```env
BANK_ACCOUNT_LABEL=은행명 계좌번호 예금주
```

Users see this account after applying. The operator checks the bank deposit manually, then clicks `입금 확인` in the admin screen. SMS is also manual: copy the prepared message in the admin screen and send it from your phone.
