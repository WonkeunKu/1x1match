# 1대1매치 DB Migration Plan

## Goal

The current prototype saves all service data in `app-data.json`. Before public web launch, move that data into a managed PostgreSQL database such as Supabase.

## Tables

- `members`: nickname, phone number, main activity area, wins, losses
- `games`: 1:1 game title, summary, rules, win condition
- `matches`: playable date/time/location, assigned game, game reveal status
- `applications`: member applications, payment state, cancellation/refund state
- `match_results`: winner and loser for completed matches
- `notification_logs`: match confirmation and game reveal messages already sent
- `event_logs`: admin/user activity history

## Mapping From Prototype Data

- `state.members` -> `members`
- `state.games` -> `games`
- `state.matches` -> `matches`
- `state.matches[].applications` -> `applications`
- `state.matches[].result` -> `match_results`
- `state.matches[].notificationLog` -> `notification_logs`
- `state.events` -> `event_logs`

## Launch Order

1. Create a Supabase project.
2. Run `database-schema.sql` in the Supabase SQL editor.
3. Set `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Restart the web server.
5. Use the current admin screen once to create or edit data, which will write to Supabase.
6. Keep the current frontend flow, then swap mock payment/SMS for real providers.

## Payment States

- `payment_pending`: user applied but payment is not confirmed yet
- `paid`: 1,000 KRW participation fee is confirmed
- `refund_requested`: user cancelled a paid application
- `refund_scheduled`: match did not fill before the deadline or admin scheduled refund
- `refunded`: refund is completed

## Important Rules

- Only non-cancelled paid applications should count toward the two-player match confirmation.
- A member cannot have two active applications for the same match.
- Match result must have different winner and loser members.
- Phone number is unique because login currently uses phone number.
- IDs are stored as text so the current prototype IDs such as `u-001` and `2026-06-05` can migrate without changing the frontend flow.
