# Phase 1 Data Model: P2P Payment Request

Concrete schema, indexes, and RLS intent. The literal SQL lives in `supabase/migrations/0001_init_schema.sql` and `0002_rls_policies.sql`.

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;      -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_cron;     -- expiry job (Supabase: enable via dashboard)
```

## Tables

### `public.users`

| Column         | Type           | Constraints                                                            |
|----------------|----------------|-----------------------------------------------------------------------|
| `id`           | `uuid`         | PK; mirrors `auth.users.id`                                            |
| `email`        | `citext`       | NOT NULL, UNIQUE                                                       |
| `display_name` | `text`         | NOT NULL, `CHECK (length(display_name) BETWEEN 1 AND 80)`              |
| `created_at`   | `timestamptz`  | NOT NULL DEFAULT `now()`                                               |

**Trigger**: `on_auth_user_created` AFTER INSERT on `auth.users` populates `public.users` with `id = NEW.id`, `email = NEW.email`, and `display_name = split_part(NEW.email, '@', 1)`.

**Why a separate table**: `auth.users` is owned by Supabase Auth and is read-restricted. We keep our own user row with the same id so RLS policies and FKs can reference it cleanly. Storing `email` in `citext` here also gives us case-insensitive recipient lookup without crossing into the protected schema.

---

### `public.payment_requests`

| Column           | Type            | Constraints                                                                           |
|------------------|-----------------|---------------------------------------------------------------------------------------|
| `id`             | `uuid`          | PK; DEFAULT `gen_random_uuid()`                                                       |
| `public_id`      | `uuid`          | NOT NULL UNIQUE; DEFAULT `gen_random_uuid()` — used in `/r/[public_id]`               |
| `sender_id`      | `uuid`          | NOT NULL FK → `public.users(id)` ON DELETE RESTRICT                                   |
| `recipient_id`   | `uuid`          | NOT NULL FK → `public.users(id)` ON DELETE RESTRICT                                   |
| `amount_cents`   | `bigint`        | NOT NULL, `CHECK (amount_cents > 0 AND amount_cents <= 100000000)`                    |
| `memo`           | `text`          | NULL allowed; `CHECK (memo IS NULL OR length(memo) <= 280)`                           |
| `status`         | `text`          | NOT NULL DEFAULT `'pending'`; `CHECK (status IN ('pending','paid','declined','cancelled','expired'))` |
| `created_at`     | `timestamptz`   | NOT NULL DEFAULT `now()`                                                              |
| `expires_at`     | `timestamptz`   | NOT NULL DEFAULT `now() + interval '7 days'`                                          |

**Table-level constraints**:
- `CHECK (sender_id <> recipient_id)` — prevents self-requests at the DB layer too.
- `CHECK (amount_cents <= current_setting('app.max_amount_cents', true)::bigint)` — optional softer gate driven by env-loaded GUC; the hard 100_000_000 ceiling stays in the column CHECK.

**Indexes**:
- PK on `id`.
- UNIQUE on `public_id`.
- `(recipient_id, status, created_at DESC)` — drives the incoming dashboard view.
- `(sender_id, status, created_at DESC)` — drives the outgoing dashboard view.
- `(status, expires_at)` PARTIAL `WHERE status = 'pending'` — drives the cron expiry sweep efficiently.

---

### `public.payment_events`

| Column        | Type            | Constraints                                                                                           |
|---------------|-----------------|-------------------------------------------------------------------------------------------------------|
| `id`          | `uuid`          | PK; DEFAULT `gen_random_uuid()`                                                                       |
| `request_id`  | `uuid`          | NOT NULL FK → `public.payment_requests(id)` ON DELETE CASCADE                                         |
| `event_type`  | `text`          | NOT NULL; `CHECK (event_type IN ('paid','declined','cancelled','expired'))`                           |
| `actor_id`    | `uuid`          | NULL allowed (NULL for system-driven `expired`); FK → `public.users(id)` ON DELETE SET NULL          |
| `created_at`  | `timestamptz`   | NOT NULL DEFAULT `now()`                                                                              |

**Table-level constraints**:
- `UNIQUE (request_id, event_type)` — the cornerstone of idempotency. At most one event of each type per request.

**Indexes**:
- PK on `id`.
- UNIQUE on `(request_id, event_type)`.
- INDEX on `request_id` for the detail view's event timeline.

---

### `public.payment_requests_public` (view)

The only DB surface reachable without authentication.

```sql
CREATE VIEW public.payment_requests_public AS
SELECT
  pr.public_id,
  pr.amount_cents,
  pr.memo,
  pr.status,
  pr.created_at,
  pr.expires_at,
  u.display_name AS sender_display_name
FROM public.payment_requests pr
JOIN public.users u ON u.id = pr.sender_id;

GRANT SELECT ON public.payment_requests_public TO anon;
```

The base table is NOT granted to `anon`.

---

## SECURITY DEFINER functions

The Server Actions for pay/decline/cancel call these functions instead of issuing UPDATE/INSERT directly. The functions run with elevated privileges so they can write to `payment_events` (which is otherwise INSERT-blocked for end users), but they encode the access checks in their bodies — caller-as-recipient for pay/decline, caller-as-sender for cancel, current-status-must-be-pending for all of them. Atomicity is provided by the function body running in a single transaction.

```sql
record_pay(p_request_id uuid)      RETURNS void  -- caller must be recipient; status pending → paid
record_decline(p_request_id uuid)  RETURNS void  -- caller must be recipient; status pending → declined
record_cancel(p_request_id uuid)   RETURNS void  -- caller must be sender; status pending → cancelled
```

A unique-violation on `payment_events` is caught and ignored (idempotent behavior).

---

## RLS Policies — intent

Full SQL lives in `supabase/migrations/0002_rls_policies.sql`. This is the policy intent for review.

### `users`
- **READ**: `id = auth.uid()` OR row is referenced as `recipient_id` of a payment_request the caller can see (subquery against `payment_requests` filtered by RLS). Lets the dashboard resolve counterparty display names.
- **WRITE**: blocked at the DB layer for now. `display_name` updates would happen through a SECURITY DEFINER function in a future iteration.

### `payment_requests`
- **READ**: `auth.uid() IN (sender_id, recipient_id)`.
- **INSERT**: `sender_id = auth.uid()` AND `sender_id <> recipient_id` AND `recipient_id` exists in `public.users`. The amount and memo CHECK constraints catch garbage inputs.
- **UPDATE — recipient pays/declines**: `auth.uid() = recipient_id` AND row's prior `status = 'pending'`. WITH CHECK: new status ∈ ('paid','declined').
- **UPDATE — sender cancels**: `auth.uid() = sender_id` AND row's prior `status = 'pending'`. WITH CHECK: new status = 'cancelled'.
- **UPDATE — expiry**: only the `expiry_runner` role (used by the cron job) can transition to 'expired'.
- **DELETE**: blocked.

### `payment_events`
- **READ**: caller is sender or recipient of the parent request.
- **INSERT**: blocked for end users; only the SECURITY DEFINER functions can write.

### Public route
- `payment_requests_public` view: SELECT granted to `anon`. The base table is NOT granted to `anon`.
