# P2P Payment Request — Project Context

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth magic link + RLS)
- Playwright for E2E with `video: 'on'`
- Vercel for deploy
- Spec-Kit drives spec → plan → tasks → implementation

## Money handling
- Store amounts as **integer cents (BIGINT)** in DB; never floats.
- Validate `amount_cents > 0` and `<= 1_000_000_00` (configurable max).

## Domain rules
- Statuses: `pending`, `paid`, `declined`, `expired`, `cancelled`.
- Default expiry: 7 days from creation. Background job or trigger marks `expired`.
- Only the recipient can `pay` or `decline`. Only the sender can `cancel` while `pending`.
- Idempotent `pay`: re-clicking must not double-charge. Use a payment_events table with a unique key.

## Code conventions
- Server-only Supabase client uses `service_role` key, never expose to client.
- All client mutations go through Next.js Route Handlers / Server Actions, not direct Supabase client.
- RLS policies enforce: users only see requests where they are sender or recipient.
- Public shareable link route is unauthenticated read-only summary view.

## Workflow
- Always update `specs/*` first, then code.
- Use Supabase MCP server for schema introspection during build.
