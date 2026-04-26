# Phase 0 Research: P2P Payment Request

This document captures the technical decisions made before architecture, with the rationale and the alternatives considered.

## R-01 — Money handling: integer cents in BIGINT

**Decision**: Store all monetary amounts as integer cents in `BIGINT` columns. No floating-point types appear anywhere in the money path (DB, API, UI state). Convert to and from dollar strings only at the UI boundary, in `lib/money.ts`.

**Rationale**: Floats introduce rounding errors that are unacceptable in a payments system. With cents-as-int, the configured maximum of $1,000,000.00 is `100_000_000`, comfortably within BIGINT and JavaScript's safe integer range (`Number.MAX_SAFE_INTEGER` is ~9 × 10^15). Validators (`z.number().int().positive().max(100_000_000)`) and a Postgres CHECK constraint give us belt-and-braces enforcement.

**Alternatives considered**:
- `NUMERIC(12,2)` in Postgres — works mathematically but adds friction in JS (`Number` cannot represent arbitrary `NUMERIC` exactly, and the driver returns strings) and forces a string-money helper layer anyway.
- DECIMAL types in JS via libraries like `decimal.js` — adds bundle weight and runtime cost; integer cents avoids both.

## R-02 — Idempotency for the pay action

**Decision**: Persist a `payment_events` table with a `UNIQUE (request_id, event_type)` constraint, where `event_type ∈ {'paid', 'declined', 'cancelled', 'expired'}`. The pay Server Action wraps the event insert and the status update inside a SECURITY DEFINER function so they are atomic. A duplicate insert (from a double-click or a network retry) raises a unique-violation that the function swallows and treats as success.

**Rationale**: FR-009 and SC-003 demand strict idempotency. Database-level uniqueness is the only safe answer under concurrency — application-level mutexes are not enough. Layering this with the `WHERE status = 'pending'` guard on the UPDATE means the second click is a no-op at both layers.

**Alternatives considered**:
- Idempotency tokens passed by the client — adds protocol complexity. Rejected for MVP because the action is naturally bounded to one event per (request, event_type), so no client token is needed.
- Optimistic locking with a `version` column — fine for general updates but conflates two concerns; the unique constraint is more direct and harder to bypass.

## R-03 — Expiry transition: pg_cron, hourly

**Decision**: Use `pg_cron` (available on Supabase out of the box) to run an hourly job:

```sql
UPDATE payment_requests
   SET status = 'expired'
 WHERE status = 'pending'
   AND expires_at < now();
INSERT INTO payment_events (request_id, event_type, actor_id)
SELECT id, 'expired', NULL
  FROM payment_requests
 WHERE status = 'expired'
   AND id NOT IN (SELECT request_id FROM payment_events WHERE event_type = 'expired');
```

SC-004 requires the transition within 1 hour of crossing the threshold; hourly cadence meets that.

**Rationale**: Keeps the expiry logic at the database layer, consistent with the broader RLS-as-authorization pattern. No application-level worker, no cold-start risk on Vercel. The job runs as a dedicated `expiry_runner` role with a narrow grant on `payment_requests` and `payment_events`.

**Alternatives considered**:
- Vercel cron — works but introduces an extra moving part and a deploy dependency. `pg_cron` lives with the data.
- A trigger-on-read that lazily expires a row — does not satisfy "automatically transitions" without a read happening, and complicates RLS. Rejected.

## R-04 — Public link identifier: UUID v4

**Decision**: Each `payment_requests` row carries a `public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE`. The public summary URL is `/r/[public_id]` and is the only path that exposes a request without authentication.

**Rationale**: FR-021 forbids guessable identifiers on the public route. UUID v4 is unguessable (122 bits of randomness), supported natively in Postgres via `pgcrypto`, and indexable. Using a separate `public_id` (instead of using the primary key) keeps the internal `id` independent and lets us revoke public access by rotating `public_id` if ever needed.

**Alternatives considered**:
- Signed JWT tokens — works but adds a key-management burden for no extra benefit at this scale.
- Random base62 short strings — equivalent security at length ≥ 22, but UUIDs are simpler and integrate with Postgres types and Supabase tooling.

## R-05 — Magic-link auth with dev-mode shortcut

**Decision**: Production uses Supabase magic-link login (`signInWithOtp` with email). In development (when `NODE_ENV !== 'production'` AND `NEXT_PUBLIC_DEV_LOGIN=1`), the login page renders two extra buttons — "Continue as Alice" and "Continue as Bob" — that hit a dev-only Server Action. The action uses the service-role key to fetch a session for a seeded user via `supabase.auth.admin.generateLink('magiclink')` and exchanges it server-side. In production builds the dev action returns 404 immediately (a `NODE_ENV` guard at the top of the file).

**Rationale**: Required to keep the on-camera recording clean — no inbox round-trip (FR-017). Production must remain magic-link only; the env-flag gate plus the `NODE_ENV` check prevents the dev shortcut from ever being callable in deployed builds.

**Alternatives considered**:
- Run Inbucket via local Supabase — works but requires the audience to watch an inbox, which the user explicitly wants to avoid.
- A throwaway public inbox like mailtrap — same problem, plus a third-party dependency on the recording.

## R-06 — RLS as the single authorization boundary

**Decision**: Every table that holds user data has RLS enabled. Policies enforce:

- `payment_requests` READ: `auth.uid() IN (sender_id, recipient_id)`.
- `payment_requests` INSERT: `sender_id = auth.uid()` AND `sender_id <> recipient_id`.
- `payment_requests` UPDATE: split per transition with WITH CHECK clauses — recipient may set status to `paid` or `declined` only when prior status is `pending`; sender may set status to `cancelled` only when prior status is `pending`. The `expired` transition is allowed only via the `expiry_runner` role used by the cron job.
- `payment_events` INSERT: only via SECURITY DEFINER functions (`record_pay`, `record_decline`, `record_cancel`) invoked from the Server Actions.
- `users` READ: caller can see their own row plus any user that is a counterparty on a request they can see (so the dashboard can render the counterparty's display name).

The public read route uses a separate view, `payment_requests_public`, which exposes only `(public_id, amount_cents, memo, status, sender_display_name)` and is `SELECT`-grantable to `anon`. The base `payment_requests` table is NOT grantable to `anon`.

**Rationale**: Keeps authorization invariants where the data lives. Server Actions can have bugs; RLS still rejects.

**Alternatives considered**:
- Application-only authorization with `service_role` everywhere — fast to write, easy to break under refactor. Rejected.

## R-07 — Server Actions over Route Handlers

**Decision**: All mutating operations (create, pay, decline, cancel) are Next.js Server Actions, not REST endpoints. The only Route Handler in the app is `/api/auth/callback`, which the Supabase magic-link flow requires.

**Rationale**: Server Actions give built-in CSRF protection, integrate with `revalidatePath`, and remove the need to invent a parallel REST surface for what is essentially form-submit logic. Reserving Route Handlers for things the framework cannot represent as actions keeps the surface small.

## R-08 — Validation: zod at the boundary

**Decision**: A single zod schema per Server Action describes the input shape, including the cents-only money rule (`z.number().int().positive().max(100_000_000)`), the email format, and the memo length. The same schemas drive `react-hook-form` resolvers in the UI for instant client-side feedback. Server Actions revalidate before any DB call.

**Rationale**: One source of truth for shape and constraint; matches Next.js + shadcn/ui idioms.

## R-09 — Live countdown: client component, server-truth fallback

**Decision**: The countdown to expiry is rendered in a small client component (`components/countdown.tsx`) that ticks every second from `expires_at`. Server-side state is the source of truth — when the countdown reaches zero, the UI shows "Expired" visually, but actions still call the server, which rejects them based on the actual `status` column (which the cron job will flip within an hour). Acceptance: SC-004 requires server-side correctness within 1 hour, the visual hint can lead truth without confusing users.

**Rationale**: Avoids polling. The visual lag at most an hour is acceptable for the demo and matches the explicit SC-004 budget.

## R-10 — Testing strategy

**Decision**:
- Unit tests (Vitest) cover `lib/money.ts` (cents conversion, formatting, parsing) and `lib/validators.ts` (zod schemas).
- E2E tests (Playwright, `video: 'on'`) cover the six primary user journeys end-to-end against a seeded test database: create, pay (idempotency check via double-click), decline, cancel, expiry (using a backdated row), and the public link in incognito. Filter and search sit in their own spec.
- A single E2E happy-path scenario runs on both mobile (375×667) and desktop (1280×800) viewports per SC-008.

**Rationale**: E2E with video is the deliverable centerpiece for the recruiter audience. Unit tests cover the parts where E2E feedback is too coarse (money math edge cases).
