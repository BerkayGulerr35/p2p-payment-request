# Implementation Plan: P2P Payment Request

**Branch**: `001-p2p-payment-requests` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-p2p-payment-requests/spec.md`

## Summary

A P2P payment request feature that lets a registered user ask another registered user for money in USD. The recipient pays (simulated) or declines; the sender can cancel while pending; pending requests auto-expire after 7 days. Built as a Next.js 15 (App Router) app on top of Supabase (Postgres + Auth + RLS), with all access rules enforced at the database layer. Money is stored as integer cents in BIGINT — never floats. The pay action is idempotent via a `payment_events` table with a unique constraint. A public, read-only summary URL per request uses an unguessable identifier. Magic-link auth in production with a dev-mode "instant login" shortcut for the on-camera demo.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 20+ (Next.js runtime)
**Primary Dependencies**: Next.js 15 (App Router) · React 19 · Tailwind CSS · shadcn/ui · @supabase/supabase-js · @supabase/ssr · zod · react-hook-form · date-fns
**Storage**: Supabase Postgres (cloud), with the `pg_cron` and `pgcrypto` extensions
**Testing**: Playwright for E2E (`video: 'on'`), Vitest for unit tests on money helpers and validators
**Target Platform**: Web (modern evergreen browsers); responsive for mobile + desktop
**Project Type**: Web application — single Next.js full-stack app (Server Components for reads, Server Actions for writes, Route Handler only for the auth callback)
**Performance Goals**: First meaningful paint under 1.5 s on a 4G profile; pay-action round-trip under 2.5 s including the simulated 2 s loading; dashboard renders under 800 ms with up to 100 requests
**Constraints**: All access rules enforced at the DB layer via RLS — no app-only authorization; amounts strictly integer cents (BIGINT) end-to-end; no floats in the money path; production builds MUST NOT expose dev-mode instant-login routes
**Scale/Scope**: MVP scoped to roughly 10 demo users and 100 seeded requests; production-ready code patterns for low thousands of users without architectural changes

## Constitution Check

No constitution file exists for this project (the constitution step was intentionally skipped — see Step 1 of the recorded walkthrough). The project's binding rules live in `CLAUDE.md` and `.claude/CLAUDE.md` and are summarized below; this plan honors all of them.

| Rule | Honored by |
|------|-----------|
| Money MUST be integer cents in BIGINT; no floats anywhere | DB schema (`amount_cents bigint CHECK > 0`), zod validators (`z.number().int()`), helper-only conversion at the UI boundary (`lib/money.ts`) |
| Access control MUST be enforced at the DB layer via RLS | Migrations `0002_rls_policies.sql`; SECURITY DEFINER functions for event inserts; no client direct-write paths |
| Server-only Supabase client uses `service_role`; the browser only sees `anon` | `lib/supabase/server.ts` vs `lib/supabase/browser.ts` split; service-role key consumed server-side only |
| Public shareable link route is unauthenticated and read-only | `/r/[public_id]` server-renders against the `payment_requests_public` view granted to `anon`; no mutations exposed |

No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/001-p2p-payment-requests/
├── plan.md                  # This file
├── research.md              # Phase 0 — technical decisions and rationale
├── data-model.md            # Phase 1 — schema, indexes, RLS policy intent
├── contracts/
│   └── server-actions.md    # Phase 1 — Server Action / Route Handler contracts
├── quickstart.md            # Phase 1 — local setup, env vars, run instructions
├── checklists/
│   └── requirements.md      # Spec quality checklist (already complete)
├── spec.md                  # Feature specification
└── tasks.md                 # Phase 2 (created by /speckit-tasks, not this command)
```

### Source code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                     # Magic-link form + dev-mode "Continue as Alice/Bob"
│   ├── (app)/
│   │   ├── dashboard/page.tsx               # Outgoing + incoming sections, filter, search
│   │   ├── requests/
│   │   │   ├── new/page.tsx                 # Create request form
│   │   │   └── [id]/page.tsx                # Detail (live countdown, pay/decline/cancel)
│   │   └── layout.tsx                       # Auth-gated layout
│   ├── r/
│   │   └── [public_id]/page.tsx             # Public read-only summary link
│   ├── api/
│   │   └── auth/callback/route.ts           # Supabase magic-link callback (only Route Handler)
│   ├── actions/
│   │   ├── create-request.ts                # Server Action — create
│   │   ├── pay-request.ts                   # Server Action — pay (idempotent)
│   │   ├── decline-request.ts               # Server Action — decline
│   │   ├── cancel-request.ts                # Server Action — cancel
│   │   └── dev-login.ts                     # Dev-only quick-login (404 in prod)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                                  # shadcn/ui primitives
│   ├── request-list.tsx
│   ├── request-card.tsx
│   ├── request-detail.tsx
│   ├── request-form.tsx
│   ├── countdown.tsx                        # Client component, ticks per second
│   ├── status-badge.tsx
│   ├── filter-bar.tsx
│   └── dev-login-buttons.tsx                # Rendered only when NEXT_PUBLIC_DEV_LOGIN=1
├── lib/
│   ├── supabase/
│   │   ├── server.ts                        # Server client (service_role)
│   │   ├── browser.ts                       # Browser client (anon)
│   │   └── middleware.ts                    # Session refresh helper
│   ├── money.ts                             # cents <-> dollars helpers + zod schema
│   ├── validators.ts                        # zod schemas for each Server Action
│   └── env.ts                               # Validated environment variables
├── middleware.ts                            # Next.js middleware: auth gate for (app)/*
└── types/
    └── database.ts                          # Generated Supabase types (via MCP)

supabase/
├── migrations/
│   ├── 0001_init_schema.sql                 # users, payment_requests, payment_events, view
│   ├── 0002_rls_policies.sql                # RLS enable + policies + SECURITY DEFINER fns
│   └── 0003_expiry_cron.sql                 # pg_cron hourly expiry job
└── seed.sql                                 # Demo Alice + Bob users

tests/
├── e2e/
│   ├── create-request.spec.ts
│   ├── pay-request.spec.ts
│   ├── decline-request.spec.ts
│   ├── cancel-request.spec.ts
│   ├── public-link.spec.ts
│   └── filter-search.spec.ts
└── unit/
    ├── money.test.ts
    └── validators.test.ts

playwright.config.ts                          # video: 'on'
next.config.ts
tailwind.config.ts
```

**Structure Decision**: A single Next.js 15 application using the App Router for both UI (Server Components for reads; small client islands for the live countdown and dev-login buttons) and backend logic (Server Actions for all mutations; one Route Handler only for the auth callback that the Supabase magic-link flow requires). Supabase migrations live under `supabase/migrations/` and are applied via the Supabase MCP server. RLS is the source of truth for authorization; Server Actions perform validation and orchestration but rely on RLS to reject anything illegal. This avoids a separate backend service while keeping the database as the security boundary.

## Phase Outputs

This `/speckit-plan` run produces:

- **Phase 0 — Research**: [research.md](./research.md)
- **Phase 1 — Design artifacts**:
  - [data-model.md](./data-model.md)
  - [contracts/server-actions.md](./contracts/server-actions.md)
  - [quickstart.md](./quickstart.md)

`tasks.md` is the responsibility of `/speckit-tasks` and is intentionally not created here.

## Complexity Tracking

No constitution violations. The architecture is intentionally minimal: one Next.js app, Supabase as the only backend, RLS as the only authorization layer, and a single in-database cron job for expiry. No microservices, no message queue, no extra cache.
