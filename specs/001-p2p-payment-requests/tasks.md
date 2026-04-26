---
description: "Task list for the P2P Payment Request feature"
---

# Tasks: P2P Payment Request

**Input**: Design documents from `/specs/001-p2p-payment-requests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-actions.md

**Tests**: Tests are INCLUDED. The spec explicitly calls for Playwright E2E with video recording (`video: 'on'`) and unit tests for money helpers and validators (FR-011, SC-008, plan §Testing).

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and deployed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared deps with another [P] task in the same phase).
- **[Story]**: Which user story this task belongs to (US1…US6).
- File paths reflect the structure in [plan.md](./plan.md).

## Path Conventions

Single Next.js project at the repository root:
- App code: `src/`
- Migrations and seed: `supabase/`
- Tests: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic tooling.

- [ ] **T001** Create the Next.js 15 project skeleton (`pnpm create next-app@latest . --ts --app --tailwind --eslint --src-dir`). Confirm the App Router and TypeScript are enabled.
- [ ] **T002** [P] Install runtime dependencies: `pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers date-fns`.
- [ ] **T003** [P] Install dev dependencies: `pnpm add -D @playwright/test vitest @vitejs/plugin-react @testing-library/react jsdom prettier prettier-plugin-tailwindcss`.
- [ ] **T004** [P] Configure Prettier (`.prettierrc.json`) with the Tailwind plugin; align with `.claude/settings.json` PostToolUse hook.
- [ ] **T005** [P] Initialize shadcn/ui via `pnpm dlx shadcn@latest init` and add the base components: `button`, `card`, `input`, `label`, `badge`, `select`, `dialog`, `toast`.
- [ ] **T006** [P] Create `playwright.config.ts` at repo root with `video: 'on'`, `use: { baseURL: 'http://localhost:3000' }`, both `Mobile Safari` (375×667) and `Desktop Chrome` (1280×800) projects, and `webServer: { command: 'pnpm dev', port: 3000 }`.
- [ ] **T007** [P] Create `vitest.config.ts` at repo root with `jsdom` environment, alias `@/` to `./src/`.
- [ ] **T008** [P] Create `src/lib/env.ts` exporting a zod-validated `env` object: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `NEXT_PUBLIC_DEV_LOGIN`, `PAYMENT_REQUEST_MAX_CENTS` (default `100000000`).
- [ ] **T009** Update `package.json` scripts: `dev`, `build`, `start`, `lint`, `format`, `test:unit` (vitest), `test:e2e` (playwright), `test:e2e:headed`.

**Checkpoint**: Project compiles, `pnpm dev` shows the default Next.js page.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, auth wiring, shared utilities. **No user-story work can begin until this phase is complete.**

### Database

- [ ] **T010** Write migration `supabase/migrations/0001_init_schema.sql`: enable `pgcrypto` and `citext` extensions; create `public.users`, `public.payment_requests`, `public.payment_events` per [data-model.md](./data-model.md); create `public.payment_requests_public` view; add the `on_auth_user_created` trigger on `auth.users`.
- [ ] **T011** Apply T010 via the Supabase MCP `apply_migration` tool. Verify tables and the view exist with `mcp__supabase__list_tables`.
- [ ] **T012** Write migration `supabase/migrations/0002_rls_policies.sql`: enable RLS on all three public tables; write the policies described in `data-model.md` (read/insert/update/delete); create the `record_pay`, `record_decline`, `record_cancel` SECURITY DEFINER functions; create the `expiry_runner` role with narrow grants.
- [ ] **T013** Apply T012 via MCP. Verify policies with `mcp__supabase__execute_sql` (`SELECT * FROM pg_policies WHERE schemaname = 'public'`).
- [ ] **T014** Write migration `supabase/migrations/0003_expiry_cron.sql`: enable `pg_cron`; schedule the hourly job that flips overdue pending requests to `expired` AND inserts the matching `payment_events` rows.
- [ ] **T015** Apply T014 via MCP. Verify with `SELECT * FROM cron.job;` that the job is scheduled.
- [ ] **T016** Write `supabase/seed.sql` to seed Alice (`alice@example.com`) and Bob (`bob@example.com`) by inserting into `auth.users` (via Supabase admin API call done from a one-off script or the dashboard) and ensuring the trigger writes `public.users` rows. Truncate-then-seed pattern so re-running is safe.
- [ ] **T017** Run T016 once against the cloud project; confirm both users appear in `public.users`.
- [ ] **T018** Generate `src/types/database.ts` via the MCP `generate_typescript_types` tool.

### Supabase clients

- [ ] **T019** [P] Create `src/lib/supabase/server.ts`: returns a server-only client using `SUPABASE_SERVICE_ROLE_KEY` (for use only inside trusted server modules — seed scripts, admin actions). Marked with the `import 'server-only'` directive.
- [ ] **T020** [P] Create `src/lib/supabase/ssr.ts`: returns the user-scoped server client for Server Components and Server Actions, using cookies via `@supabase/ssr`.
- [ ] **T021** [P] Create `src/lib/supabase/browser.ts`: returns the user-scoped browser client (used inside Client Components only).
- [ ] **T022** Create `src/lib/supabase/middleware.ts`: session refresh helper used by `src/middleware.ts`.
- [ ] **T023** Create `src/middleware.ts` at repo `src/` root: route-gates `/(app)/*` paths — unauthenticated requests redirect to `/login`. Public paths `/`, `/login`, `/r/*`, `/api/auth/callback` pass through.

### Shared validation and money helpers

- [ ] **T024** [P] Create `src/lib/money.ts`: `centsToDollars(cents: number): string` (always 2dp), `dollarsToCents(input: string): number` (rejects floats, commas, whitespace), `formatUSD(cents: number): string`, and the zod fragment `amountCentsSchema`.
- [ ] **T025** [P] Create `src/lib/validators.ts`: zod schemas for each Server Action input — `createPaymentRequestSchema`, `payRequestSchema`, `declineRequestSchema`, `cancelRequestSchema`.

### Auth

- [ ] **T026** Create `src/app/api/auth/callback/route.ts`: standard `exchangeCodeForSession`, then `redirect('/dashboard')`.
- [ ] **T027** Create `src/app/(app)/layout.tsx`: server component that reads the session, redirects to `/login` when missing, renders the app shell.
- [ ] **T028** Create `src/app/(auth)/login/page.tsx`: form for email magic-link sign-in (calls `signInWithOtp` from a client component); renders the dev-login buttons (next phase) when `NEXT_PUBLIC_DEV_LOGIN === '1'`.
- [ ] **T029** Create `src/app/actions/dev-login.ts`: dev-only Server Action with the double guard (NODE_ENV check + env-flag check). Calls `auth.admin.generateLink` for the requested persona, sets the session cookie, redirects to `/dashboard`.
- [ ] **T030** Create `src/components/dev-login-buttons.tsx`: client component rendering "Continue as Alice" and "Continue as Bob" forms posting to T029.

**Checkpoint**: User can sign in (magic link works in prod, dev buttons work in dev). Dashboard renders an empty shell. RLS rejects anonymous writes to base tables. Public view returns rows when queried as `anon`.

---

## Phase 3: User Story 1 — Send a payment request (Priority: P1) 🎯 MVP

**Goal**: A registered user can fill out a form to ask another registered user for money.

**Independent Test**: As Alice, open `/requests/new`, submit `bob@example.com` / `$50.00` / "Lunch". Confirm a pending row appears in Alice's outgoing list and Bob's incoming list.

### Tests

- [ ] **T031** [P] [US1] Unit tests for money helpers (`tests/unit/money.test.ts`): integer-cents round-trip, rejection of floats and commas, formatting at boundaries (1, 99, 100, 1_00, 100_000_000).
- [ ] **T032** [P] [US1] Unit tests for validators (`tests/unit/validators.test.ts`): valid inputs pass, invalid amounts/emails/memos fail with the expected zod paths.
- [ ] **T033** [P] [US1] E2E test for create-request (`tests/e2e/create-request.spec.ts`): happy path; recipient-not-found error; amount-too-large error; self-request rejection. Run on both Mobile Safari and Desktop Chrome projects.

### Implementation

- [ ] **T034** [P] [US1] Create `src/components/status-badge.tsx`: maps each status to a colored `<Badge>` from shadcn/ui.
- [ ] **T035** [P] [US1] Create `src/components/request-form.tsx`: client component using `react-hook-form` + zod resolver from `validators.ts`. Calls `createPaymentRequest` Server Action via `useFormState`.
- [ ] **T036** [P] [US1] Create `src/app/actions/create-request.ts` per [contracts/server-actions.md](./contracts/server-actions.md). Returns `{ ok, public_id }` or `{ error }`.
- [ ] **T037** [US1] Create `src/app/(app)/requests/new/page.tsx`: server component rendering `<RequestForm />`.
- [ ] **T038** [P] [US1] Create `src/components/request-card.tsx`: shows counterparty display name, amount, memo preview, status badge, created-at relative time. Used in list views.
- [ ] **T039** [US1] Create `src/app/(app)/dashboard/page.tsx`: server component, queries outgoing requests for the current user via the SSR client, renders a list of `RequestCard`s. Incoming list comes in US2.

**Checkpoint**: US1 is fully functional — Alice can create a request to Bob and see it on her dashboard. RLS rejects mismatched senders. T033 passes on both viewports.

---

## Phase 4: User Story 2 — Pay or decline an incoming request (Priority: P1) 🎯 MVP

**Goal**: The recipient can pay (simulated) or decline a pending request from their dashboard or detail view.

**Independent Test**: With a pending request from Alice → Bob present, Bob signs in, opens the detail, clicks "Pay", waits ~2 seconds, and sees the status flip to "paid" on both his and Alice's dashboards. A double-click on Pay results in only one `payment_events` row.

### Tests

- [ ] **T040** [P] [US2] E2E test for pay flow (`tests/e2e/pay-request.spec.ts`): happy path with the 2–3 s loading visible; idempotency check via double-click (assert exactly one event in DB); blocked when status is not pending.
- [ ] **T041** [P] [US2] E2E test for decline flow (`tests/e2e/decline-request.spec.ts`): happy path; blocked for non-recipient.

### Implementation

- [ ] **T042** [P] [US2] Create `src/app/actions/pay-request.ts` per contracts: 2–3 s sleep, `rpc('record_pay', …)`, error mapping, `revalidatePath` for dashboard and detail.
- [ ] **T043** [P] [US2] Create `src/app/actions/decline-request.ts` per contracts: `rpc('record_decline', …)`, error mapping, revalidate.
- [ ] **T044** [P] [US2] Create `src/components/request-detail.tsx`: server component for the static parts (counterparty, amount, memo, status, created/expires) + a small client island for the action buttons that show the loading state. Buttons render conditionally based on caller role and status.
- [ ] **T045** [US2] Create `src/app/(app)/requests/[id]/page.tsx`: server component fetching the request by id (RLS filters), rendering `RequestDetail` and a `payment_events` timeline.
- [ ] **T046** [US2] Update `src/app/(app)/dashboard/page.tsx` to render two sections — Outgoing (sender_id = caller) and Incoming (recipient_id = caller).

**Checkpoint**: US2 is fully functional — pay and decline flow end-to-end. Idempotency holds under double-click. T040 and T041 pass on both viewports.

---

## Phase 5: User Story 3 — Cancel an outgoing pending request (Priority: P2)

**Goal**: The sender can cancel a pending request before the recipient acts.

**Independent Test**: Alice creates a request to Bob, opens the detail, clicks "Cancel". Confirm status flips to "cancelled" and Bob can no longer pay or decline.

### Tests

- [ ] **T047** [P] [US3] E2E test for cancel (`tests/e2e/cancel-request.spec.ts`): happy path; blocked when not pending; blocked for non-sender.

### Implementation

- [ ] **T048** [P] [US3] Create `src/app/actions/cancel-request.ts` per contracts: `rpc('record_cancel', …)`, error mapping, revalidate.
- [ ] **T049** [US3] Update `src/components/request-detail.tsx` to render a "Cancel" button when the caller is the sender and status is pending. Wire to T048.

**Checkpoint**: US3 is fully functional. T047 passes.

---

## Phase 6: User Story 4 — Auto-expire after 7 days (Priority: P2)

**Goal**: Pending requests transition to `expired` automatically within 1 hour of crossing the 7-day mark.

**Independent Test**: Insert a row with a backdated `expires_at`. Manually trigger the cron job (`SELECT cron.schedule(...);` or the function directly). Confirm status flips to `expired` and a `payment_events` row of type `expired` is inserted.

### Tests

- [ ] **T050** [P] [US4] E2E test for expiry (`tests/e2e/expire-request.spec.ts`): create a request, backdate `expires_at` via a SECURITY DEFINER test helper (or direct SQL via service-role in test setup), invoke the expiry function, refresh the dashboard, assert "expired" badge and that subsequent pay/decline/cancel attempts are rejected.

### Implementation

- [ ] **T051** [US4] Verify the `pg_cron` job created in T015 is active. Add a test SQL helper function `test_run_expiry_now()` (idempotent, restricted to the test database role) so E2E can trigger expiry without waiting an hour.
- [ ] **T052** [P] [US4] Create `src/components/countdown.tsx`: client component, takes `expiresAt: Date`, ticks once per second, formats `Xd Yh Zm`, switches to "Expired" visually when ≤ 0 (server is the source of truth for the actual status).
- [ ] **T053** [US4] Add `Countdown` to `RequestDetail` for pending requests.
- [ ] **T054** [US4] Add a small countdown indicator to `RequestCard` for pending rows (e.g., "expires in 3d 4h").

**Checkpoint**: US4 is fully functional. T050 passes against the test helper.

---

## Phase 7: User Story 5 — Public read-only link (Priority: P3)

**Goal**: Any visitor with the public URL of a request can view a read-only summary, even without an account.

**Independent Test**: For an existing request, copy the public URL. Open it in an incognito window. Confirm it shows amount, memo, status, sender display name, and no action controls. Try to access a list URL or call any mutation — confirm rejection.

### Tests

- [ ] **T055** [P] [US5] E2E test for public link (`tests/e2e/public-link.spec.ts`): incognito context (no auth), visits `/r/[public_id]`, asserts read-only summary; tries `/r/__nope__` and asserts 404; tries direct API/Action call and asserts blocked.

### Implementation

- [ ] **T056** [US5] Create `src/app/r/[public_id]/page.tsx`: server component that creates an `anon` Supabase client (no cookies, no service role), queries `payment_requests_public` by `public_id`, renders the summary or `notFound()`.
- [ ] **T057** [US5] Add a "Copy public link" button to `RequestDetail` that copies `${origin}/r/${public_id}` to clipboard.

**Checkpoint**: US5 is fully functional. T055 passes.

---

## Phase 8: User Story 6 — Filter and search the dashboard (Priority: P3)

**Goal**: A user with many requests can find a specific one via status filter and free-text search.

**Independent Test**: Seed 12 mixed-status requests. As Alice, apply `status=pending`. Confirm only pending rows show. Search "Lunch" — confirm only matching rows show.

### Tests

- [ ] **T058** [P] [US6] E2E test for filter+search (`tests/e2e/filter-search.spec.ts`): seed extra rows, exercise both filter and search, assert URL params reflect state.

### Implementation

- [ ] **T059** [P] [US6] Create `src/components/filter-bar.tsx`: client component with a status `<Select>` and a debounced search `<Input>`. Pushes URL params (`status`, `q`) via `router.replace`.
- [ ] **T060** [US6] Update `src/app/(app)/dashboard/page.tsx` to read `status` and `q` from `searchParams`, apply them to the SSR Supabase query (`.eq('status', …)` and `.or('memo.ilike.%q%,users.display_name.ilike.%q%')`).
- [ ] **T061** [US6] Update the dashboard SSR query to join `users` so the search can match counterparty display name.

**Checkpoint**: US6 is fully functional. T058 passes.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] **T062** [P] Add `loading.tsx` files for `(app)/dashboard`, `(app)/requests/new`, `(app)/requests/[id]`, and `r/[public_id]`.
- [ ] **T063** [P] Add `error.tsx` files at the same locations for graceful error boundaries.
- [ ] **T064** [P] Responsive pass: review every page on Mobile Safari (375×667) and Desktop Chrome (1280×800); fix any clipping, overflow, or hit-target issues.
- [ ] **T065** Run `quickstart.md` from a fresh clone in a temp directory: `pnpm install`, `pnpm test:unit`, `pnpm test:e2e`. Update the doc if any step is missing.
- [ ] **T066** Write `README.md`: 1-paragraph overview, screenshot of the dashboard, the seven core domain rules in bullet form, deploy URL, demo credentials (Alice/Bob), link to the spec.
- [ ] **T067** Push the feature branch to GitHub and open a pull request to `main`.
- [ ] **T068** Configure Vercel project: link the GitHub repo, set the env vars (omit `NEXT_PUBLIC_DEV_LOGIN`), set the Supabase Auth redirect URL to the Vercel deployment URL.
- [ ] **T069** Deploy to Vercel preview. Run a manual smoke test of the magic-link flow against a real inbox; verify the dashboard, create, pay, decline, cancel, and public link all work.
- [ ] **T070** Merge the PR to `main`; tag `v0.1.0`; promote the preview deployment to production.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 Setup** has no dependencies; it can start immediately.
- **Phase 2 Foundational** depends on Phase 1 and **blocks every user story**.
- **Phases 3–8 (US1–US6)** all depend on Phase 2 completion. After Phase 2:
  - US1 and US2 are both P1 and form the MVP loop. They share `RequestDetail` (T044) — US1 finishes its slice before US2 layers on the action buttons.
  - US3, US4, US5, US6 can be tackled in parallel once US1+US2 are merged, but US3 and US4 both touch `RequestDetail` so coordinate or serialize those.
- **Phase 9 Polish** depends on all desired user stories being complete (or at least US1+US2 if shipping the MVP early).

### Within each user story

- Tests are written first and MUST FAIL before the implementation tasks begin (TDD discipline; the spec explicitly requested tests).
- Models/migrations precede services precede UI.
- A user story is "done" when its E2E test passes on both Mobile Safari and Desktop Chrome viewports.

### Parallel opportunities

- All `[P]` tasks within a phase can run concurrently (different files, no shared state). For Phase 2 these are: T019/T020/T021 (Supabase clients), T024/T025 (helpers), and T030 (dev-login buttons) once their dependencies land.
- All test tasks marked `[P]` for a story can be authored in parallel by different developers.
- US3, US5, and US6 can be implemented in parallel after the MVP (US1+US2) is complete.

---

## Implementation Strategy

### MVP first (US1 + US2)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational) — this is the longest single phase.
3. Complete Phase 3 (US1) — stop and validate the create flow.
4. Complete Phase 4 (US2) — stop and validate the pay/decline flow.
5. Deploy to a Vercel preview, demo the MVP loop end-to-end. **This is a shippable MVP.**

### Incremental delivery after MVP

6. Add US3 (cancel) → demo.
7. Add US4 (expiry + countdown) → demo.
8. Add US5 (public link) → demo.
9. Add US6 (filter + search) → demo.
10. Polish (Phase 9) → tag v0.1.0 → push to production.

### Notes

- Commit after each task or logical group (the `after_*` Spec-Kit hooks make this easy via `/speckit-git-commit`).
- Verify each E2E test FAILS first against an empty implementation, then turns GREEN as the story is built — this is the spec's "FR is testable" promise honored.
- When in doubt about authorization, re-read [data-model.md](./data-model.md) — the RLS policies are the contract, not the application code.
