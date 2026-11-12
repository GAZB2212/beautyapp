# Salon App (working name)

White-label online booking for independent hair salons and stylists. A GAJO Creative product.
Flat monthly fee, no marketplace, salons own their client relationships.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the plan and data model.

## Layout

| Path | What |
|---|---|
| `apps/book` | Public booking page (web) and client app (iOS/Android). Expo Router. |
| `apps/salon` | Salon dashboard: web, iPad, phone. Expo Router. |
| `packages/core` | Shared domain logic (slugs, money, availability, booking rules). |
| `packages/api` | Typed Supabase client and query helpers. |
| `packages/ui` | Shared components and brand theming. |
| `packages/db` | Generated database types. |
| `packages/config` | Shared tsconfig bases. |
| `supabase/` | Migrations, seed data, Edge Functions, local config. |

## Getting started

```bash
pnpm install
cp .env.example apps/book/.env && cp .env.example apps/salon/.env
pnpm db:start          # local Supabase (needs Docker); prints the anon key for .env
pnpm web:book          # booking page on http://localhost:8081
pnpm web:salon         # dashboard
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Web builds: `pnpm --filter @salon/book build`.
