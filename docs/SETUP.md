# Setup

## Local development without Docker

The apps can run against a plain local Postgres (15+) using a small stand-in for the
Supabase web API. This is how the end-to-end browser tests in this repo were run.

```bash
export PGHOST=/tmp PGPORT=5432 PGUSER=postgres      # wherever your Postgres listens
scripts/dev-db.sh                                   # creates salon_dev: migrations + sample salon
PGDATABASE=salon_dev pnpm --filter @salon/local-backend start    # http://localhost:54321
```

Then in `apps/book/.env` and `apps/salon/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=local-anon-key
EXPO_PUBLIC_BOOKING_ORIGIN=http://localhost:8081
```

`pnpm web:book` opens the booking page (try `/sarahs-hair`); `pnpm web:salon` the dashboard.
"Emails" the stand-in would have sent (confirmation and password-reset links) are listed at
`http://localhost:54321/dev/outbox`. The stand-in is for development only: its tokens are
unsigned and it must never be deployed.

With Docker available, prefer the real local stack: `pnpm db:start` (applies migrations and
`supabase/seed.sql`), and use the URL and anon key it prints.

Database tests: `scripts/test-db.sh` (plain Postgres with pgTAP) or `supabase test db`.

## Hosted project (once, per environment)

1. Create the Supabase project (London, `eu-west-2`).
2. Apply `supabase/migrations/*` in order. Do not run `supabase/seed.sql` against it.
3. Authentication settings in the Supabase dashboard:
   - Email provider on, **Confirm email** on, minimum password length 8.
   - **Site URL**: the dashboard's address. **Redirect URLs**: the dashboard's address with
     `/` and `/reset-password`.
   - Custom SMTP (e.g. Resend) before real salons sign up: the built-in sender is limited to
     a handful of emails per hour.
4. Set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the publishable key) and
   `EXPO_PUBLIC_BOOKING_ORIGIN` for both web apps where they are hosted.
5. Run the Supabase security advisor and resolve anything it reports.
