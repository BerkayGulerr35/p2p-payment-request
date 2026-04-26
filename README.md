# P2P Payment Request

A peer-to-peer payment request app: any registered user can ask another registered user for money in USD; the recipient can pay (simulated) or decline; the sender can cancel while pending; unanswered requests auto-expire after seven days. Built as a Next.js 15 + Supabase take-home assignment, with all access rules enforced at the database layer.

> **Note** — the "pay" action is a simulation only. No real payment processor is integrated.

---

## Stack

| Layer      | Choice                                                             |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui |
| Backend    | Supabase (Postgres, Auth, Row-Level Security, `pg_cron`)           |
| Validation | zod (shared between Server Actions and `react-hook-form`)          |
| Tests      | Vitest (unit) · Playwright (E2E with `video: 'on'`)                |
| Tooling    | Spec-Kit (spec → plan → tasks → implement) · Supabase MCP server   |
| Deploy     | Vercel                                                             |

---

## Quick start

### Prerequisites

- Node 20+ and `pnpm` 10+
- A Supabase project (cloud or local) with the `pg_cron`, `pgcrypto`, and `citext` extensions available

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in real values:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SECRET_KEY=<service-role-secret>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEV_LOGIN=1               # OMIT in production builds
SUPABASE_ACCESS_TOKEN=<personal-token> # used by the MCP server
SUPABASE_PROJECT_REF=<project-ref>
```

`SUPABASE_SECRET_KEY` MUST stay server-only.

### 3. Apply database migrations

The three migrations live under `supabase/migrations/`:

1. `0001_init_schema.sql` — tables, indexes, public read-only view, signup trigger
2. `0002_rls_policies.sql` — RLS, SECURITY DEFINER state-transition functions
3. `0003_expiry_cron.sql` — hourly `pg_cron` job that flips overdue requests to `expired`

Apply them via the Supabase MCP server's `apply_migration` tool, the Supabase dashboard's SQL editor, or `supabase db push` once your project is linked.

### 4. Run

```bash
pnpm dev          # http://localhost:3000
```

---

## Demo log-in

With `NEXT_PUBLIC_DEV_LOGIN=1`, the `/login` page shows two extra buttons:

- **Continue as Alice** — `alice@example.com`
- **Continue as Bob** — `bob@example.com`

Both sign in via a dev-only Server Action that bypasses the email round-trip. The action is hard-blocked in production builds (double-guarded by `NODE_ENV` and the env flag). The first click for each persona lazily creates the user via the admin API.

In production, the magic-link flow is the only way in — enter your email, click the link, land on the dashboard.

---

## Tests

```bash
pnpm test:unit              # vitest — money helpers, validators
pnpm test:e2e               # playwright — full user journeys (videos saved to test-results/)
pnpm test:e2e:headed        # same, with a visible browser
```

The Playwright config has `video: 'on'`, so every E2E run produces a video — useful for the recruiter walkthrough and for debugging. Tests cover all six user stories:

- `tests/e2e/create-request.spec.ts` — US1: send a request (happy path + validation)
- `tests/e2e/pay-request.spec.ts` — US2 pay (with idempotency-after-paid check)
- `tests/e2e/decline-request.spec.ts` — US2 decline
- `tests/e2e/cancel-request.spec.ts` — US3: cancel as sender
- `tests/e2e/public-link.spec.ts` — US5: public read-only summary
- `tests/e2e/filter-search.spec.ts` — US6: dashboard filter + search

---

## Domain rules (the load-bearing ones)

- Amounts are stored as **integer cents (`bigint`)** end-to-end. No floats anywhere in the money path.
- Single currency: **USD only**. Min `$0.01`, max `$1,000,000.00` (configurable via `PAYMENT_REQUEST_MAX_CENTS`).
- Status flow: `pending → {paid, declined, cancelled, expired}`. All non-pending statuses are terminal.
- **RLS is the source of truth** for who-can-do-what. The Server Actions perform validation and orchestration; the database rejects anything illegal even if the application has a bug.
- The pay action is **idempotent** at the DB layer: the unique constraint `(request_id, event_type)` on `payment_events` rejects duplicate pay events. Re-clicking pay never produces a second payment event.
- Only the **recipient** can pay or decline. Only the **sender** can cancel. Both only while `pending`.
- Recipients must be **registered users** — sending to an unknown email returns a validation error. No invite-by-email flow in MVP.
- Each request has an unguessable `public_id` (UUID v4). The public read-only summary at `/r/[public_id]` is the only path that exposes a request to unauthenticated visitors, and it cannot list, modify, or pay anything.
- The 7-day expiry transition is driven by an hourly `pg_cron` job at the database layer — not the application.

---

## Architecture

A single Next.js application using the App Router. Server Components for reads, Server Actions for mutations, one Route Handler for the Supabase magic-link callback. Supabase is the only backend service.

```text
src/
├── app/
│   ├── (auth)/login/        # magic-link form + dev quick-login buttons
│   ├── (app)/               # auth-gated layout
│   │   ├── dashboard/       # outgoing + incoming + filter + search
│   │   └── requests/{new,[id]}/
│   ├── r/[public_id]/       # public read-only summary
│   ├── api/auth/callback/   # the only Route Handler
│   └── actions/             # Server Actions: create / pay / decline / cancel / sign-out / dev-login
├── components/              # request-form, request-detail, request-actions, countdown, …
├── lib/
│   ├── supabase/            # server (service-role) / ssr (cookies) / browser (anon) / anon (public)
│   ├── money.ts             # cents <-> dollars + zod schema
│   └── validators.ts        # zod schemas for each Server Action
└── middleware.ts            # session refresh + auth gate
```

Full design artifacts live under [`specs/001-p2p-payment-requests/`](./specs/001-p2p-payment-requests/):

- [`spec.md`](./specs/001-p2p-payment-requests/spec.md) — feature specification with 6 user stories and 21 functional requirements
- [`plan.md`](./specs/001-p2p-payment-requests/plan.md) — implementation plan and project structure
- [`research.md`](./specs/001-p2p-payment-requests/research.md) — 10 technical decisions with rationale
- [`data-model.md`](./specs/001-p2p-payment-requests/data-model.md) — schema, indexes, RLS policy intent
- [`contracts/server-actions.md`](./specs/001-p2p-payment-requests/contracts/server-actions.md) — input/output contract for every Server Action
- [`tasks.md`](./specs/001-p2p-payment-requests/tasks.md) — 70 ordered tasks across setup, foundation, 6 user stories, and polish
- [`quickstart.md`](./specs/001-p2p-payment-requests/quickstart.md) — local-setup walkthrough

---

## Deploy (Vercel)

```bash
vercel --prod
```

In the Vercel project settings, set the same env vars as `.env.local` **except** OMIT `NEXT_PUBLIC_DEV_LOGIN` so the demo buttons never appear in production. Add the production domain to Supabase Auth → URL Configuration so magic-link redirects work.

---

## License

This is an interview take-home. No license declared.
