# Phase 1 Contracts: Server Actions

All mutating operations are Next.js Server Actions. Each is a single async function on the server, called from React forms via `<form action={...}>` or via `useFormState`. CSRF and session validation are handled by the Next.js framework + the Supabase SSR helper.

Read paths are direct queries from Server Components — no Action surface. The only Route Handler is the auth callback that the Supabase magic-link flow requires.

## `createPaymentRequest`

**File**: `src/app/actions/create-request.ts`

**Input** (zod-validated):

```ts
{
  recipient_email: string;        // valid email; lookup is case-insensitive
  amount_cents: number;           // integer, 1..100_000_000
  memo: string | null;            // length 0..280; null allowed
}
```

**Behavior**:
1. Read the session; if not authenticated, return `{ error: 'unauthenticated' }`.
2. Validate input with the `createPaymentRequestSchema` zod schema; on failure return `{ error: 'validation_failed', issues }`.
3. Resolve `recipient_id` via `SELECT id FROM public.users WHERE email = $1` (citext column means case-insensitivity is automatic). Not found → `{ error: 'recipient_not_found' }`.
4. If `recipient_id = auth.uid()` → `{ error: 'self_request_not_allowed' }`.
5. INSERT into `public.payment_requests (sender_id, recipient_id, amount_cents, memo)` from the user-scoped Supabase client (`anon` key + session). RLS enforces the sender-equals-caller invariant.
6. `revalidatePath('/dashboard')`.

**Output**:
- Success: `{ ok: true, public_id: string }`.
- Failure: `{ error: code, issues?: ZodIssue[] }`.

**Error codes**: `unauthenticated`, `validation_failed`, `recipient_not_found`, `self_request_not_allowed`, `internal`.

---

## `payRequest`

**File**: `src/app/actions/pay-request.ts`

**Input**: `{ request_id: string }` (UUID).

**Behavior**:
1. Read the session; if not authenticated, return `{ error: 'unauthenticated' }`.
2. Sleep a uniform random 2000–3000 ms to simulate processing (this satisfies FR-011 and is visible to the user as the loading state).
3. Call `rpc('record_pay', { p_request_id: request_id })` against the user-scoped client. The function:
   - Verifies `auth.uid() = recipient_id` AND current status is `pending`.
   - INSERTs into `payment_events (request_id, event_type='paid', actor_id=auth.uid())`. The `UNIQUE (request_id, event_type)` constraint rejects a duplicate insert and the function catches the unique-violation, returning success (idempotent).
   - UPDATEs `payment_requests SET status = 'paid'` only if status is still `pending`.
4. Map RPC errors to user-friendly codes (`not_pending`, `not_recipient`).
5. `revalidatePath('/dashboard'); revalidatePath('/requests/' + request_id, 'page');`.

**Output**: `{ ok: true }` on success or idempotent re-call; `{ error: code }` otherwise.

**Error codes**: `unauthenticated`, `not_pending`, `not_recipient`, `internal`.

---

## `declineRequest`

**File**: `src/app/actions/decline-request.ts`

**Input**: `{ request_id: string }`.

**Behavior**: Symmetric to `payRequest` but with `event_type='declined'`, no simulated sleep, and the RPC `record_decline`.

**Error codes**: `unauthenticated`, `not_pending`, `not_recipient`, `internal`.

---

## `cancelRequest`

**File**: `src/app/actions/cancel-request.ts`

**Input**: `{ request_id: string }`.

**Behavior**:
1. Read the session; if not authenticated, return `{ error: 'unauthenticated' }`.
2. Call `rpc('record_cancel', { p_request_id: request_id })`. The function:
   - Verifies `auth.uid() = sender_id` AND current status is `pending`.
   - INSERTs into `payment_events (request_id, event_type='cancelled', actor_id=auth.uid())`.
   - UPDATEs `payment_requests SET status = 'cancelled'` only if status is still `pending`.
3. Map RPC errors to `not_pending` / `not_sender`.
4. `revalidatePath('/dashboard'); revalidatePath('/requests/' + request_id, 'page');`.

**Output**: `{ ok: true }` or `{ error: code }`.

**Error codes**: `unauthenticated`, `not_pending`, `not_sender`, `internal`.

---

## `devLoginAs` (development only)

**File**: `src/app/actions/dev-login.ts`

**Input**: `{ persona: 'alice' | 'bob' }`.

**Behavior**:
1. Top-of-file guard: if `process.env.NODE_ENV === 'production'` OR `process.env.NEXT_PUBLIC_DEV_LOGIN !== '1'` → `notFound()`.
2. Use the service-role client to call `supabase.auth.admin.generateLink({ type: 'magiclink', email })` for the seeded persona's email.
3. Exchange the returned token for a session server-side (or write the session cookie directly via the SSR helper).
4. `redirect('/dashboard')`.

**Output**: redirect on success; `notFound()` in production builds.

**Error codes**: `unknown_persona`, `internal`.

This action MUST NOT be reachable in deployed builds. The double guard (NODE_ENV check + env-flag check) is the contract.

---

## Read paths (no actions; direct Supabase queries from Server Components)

### Dashboard — `/dashboard`
Server component queries `payment_requests` filtered by `status` (from URL param) and a free-text `q` (LIKE on `memo` and a join to `users.display_name`). RLS limits the result set to caller's rows. Splits into outgoing (sender_id = caller) and incoming (recipient_id = caller).

### Request detail — `/requests/[id]`
Server component queries by `id`. RLS filters. Includes a `payment_events` timeline.

### Public summary — `/r/[public_id]`
Server component queries `payment_requests_public` view as the `anon` role (no session). Returns 404 if the row is missing or the view query yields zero rows.

---

## Auth callback — Route Handler (only one in the app)

**File**: `src/app/api/auth/callback/route.ts`

The Supabase magic-link flow requires a callback URL that exchanges the link for a session cookie.

**Behavior**: standard `supabase.auth.exchangeCodeForSession(code)` then `redirect('/dashboard')`. Handles both `?code=` and `?error=` query strings.
