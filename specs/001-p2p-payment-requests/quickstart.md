# Quickstart: P2P Payment Request

The minimum to get the app running locally and to run the test suite.

## Prerequisites

- Node 20 or later, and `pnpm` 10 or later.
- A Supabase project (cloud or local). For the recorded build we use the cloud project `p2p-payment-request` (ref `wifkexhmgnriwcsdsjyu`).
- The Supabase MCP server is wired in `.mcp.json` for schema introspection and migration apply during development. Make sure it is in **write** mode (no `--read-only` flag) so `apply_migration` works.

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_DEV_LOGIN=1                # enables "Continue as Alice/Bob" buttons; OMIT in production
PAYMENT_REQUEST_MAX_CENTS=100000000    # $1,000,000 default
```

> Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It is read only by server-side code (Server Actions, the auth callback Route Handler, the seed script).

## Install and run

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Database setup

Migrations live under `supabase/migrations/` and are applied via the Supabase MCP server (`apply_migration`) during the build. Apply them in order:

1. `0001_init_schema.sql` — extensions, tables, view, indexes, signup trigger.
2. `0002_rls_policies.sql` — RLS enablement, policies, SECURITY DEFINER functions, and the `expiry_runner` role with its narrow grants.
3. `0003_expiry_cron.sql` — `pg_cron` hourly job that flips pending requests past `expires_at` to `expired` and writes the matching `payment_events`.

Seed data (Alice and Bob) lives in `supabase/seed.sql` and is applied once via the Supabase SQL editor or `psql`. The seed assumes `NEXT_PUBLIC_DEV_LOGIN=1` is set in `.env.local`.

## Tests

```bash
pnpm test:unit              # vitest — money helpers, validators
pnpm test:e2e               # playwright — full user journeys (videos saved to test-results/)
pnpm test:e2e:headed        # same, with a visible browser for debugging
```

The Playwright config has `video: 'on'` so every test produces a video — useful for the recruiter walkthrough video and for debugging.

The E2E suite expects a clean database state per run; the `globalSetup` in `playwright.config.ts` resets seed data before the first test.

## Demo log-in (recording mode)

With `NEXT_PUBLIC_DEV_LOGIN=1` set, the `/login` page shows two extra buttons:

- **Continue as Alice** — signs in as `alice@example.com`.
- **Continue as Bob** — signs in as `bob@example.com`.

Both run a Server Action that mints a session via `auth.admin.generateLink` server-side. The action returns 404 in production builds (double-guarded by `NODE_ENV` check and the env-flag check).

Use this only for the recording. In production, magic-link login is the only path.

## Deploy

```bash
vercel --prod
```

Set the same env vars in the Vercel project, **except** OMIT `NEXT_PUBLIC_DEV_LOGIN`. The Supabase Auth redirect URL must include the production domain (Auth → URL Configuration in the Supabase dashboard). Confirm the `pg_cron` job is still scheduled in the Database → Cron Jobs section after deploy.

## Common workflows

- **Add a column or change a constraint**: write a new file in `supabase/migrations/` (e.g. `0004_add_xxx.sql`), apply via `apply_migration` through the MCP server, then regenerate `src/types/database.ts` via `generate_typescript_types`.
- **Reset the demo data**: `psql $DATABASE_URL -f supabase/seed.sql` (the script truncates the relevant tables before reseeding).
- **Tail logs in dev**: `pnpm dev` runs Next.js with telemetry off; for Supabase logs use the dashboard or the MCP `get_logs` tool.
