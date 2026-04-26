-- Migration 0001 — initial schema for the P2P Payment Request feature.
-- Tables: public.users, public.payment_requests, public.payment_events
-- View:   public.payment_requests_public (unauthenticated read-only summary)
-- Trigger: on_auth_user_created mirrors auth.users → public.users

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ─────────────────────────────────────────────────────────────
-- public.users — mirrors auth.users with project-owned columns
-- ─────────────────────────────────────────────────────────────

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique not null,
  display_name text not null check (length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

-- Trigger: when an auth.users row is inserted, mirror it into public.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────
-- public.payment_requests
-- ─────────────────────────────────────────────────────────────

create table if not exists public.payment_requests (
  id            uuid primary key default gen_random_uuid(),
  public_id     uuid not null unique default gen_random_uuid(),
  sender_id     uuid not null references public.users(id) on delete restrict,
  recipient_id  uuid not null references public.users(id) on delete restrict,
  amount_cents  bigint not null,
  memo          text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  constraint payment_requests_no_self_request check (sender_id <> recipient_id),
  constraint payment_requests_amount_cents_check check (amount_cents > 0 and amount_cents <= 100000000),
  constraint payment_requests_memo_length_check check (memo is null or length(memo) <= 280),
  constraint payment_requests_status_check check (status in ('pending','paid','declined','cancelled','expired'))
);

create index if not exists payment_requests_recipient_idx
  on public.payment_requests (recipient_id, status, created_at desc);
create index if not exists payment_requests_sender_idx
  on public.payment_requests (sender_id, status, created_at desc);
create index if not exists payment_requests_pending_expiry_idx
  on public.payment_requests (status, expires_at)
  where status = 'pending';

-- ─────────────────────────────────────────────────────────────
-- public.payment_events — immutable audit trail with idempotency
-- ─────────────────────────────────────────────────────────────

create table if not exists public.payment_events (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.payment_requests(id) on delete cascade,
  event_type  text not null check (event_type in ('paid','declined','cancelled','expired')),
  actor_id    uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (request_id, event_type)
);

create index if not exists payment_events_request_idx on public.payment_events (request_id);

-- ─────────────────────────────────────────────────────────────
-- public.payment_requests_public — view exposed to unauth visitors
-- ─────────────────────────────────────────────────────────────

create or replace view public.payment_requests_public as
  select
    pr.public_id,
    pr.amount_cents,
    pr.memo,
    pr.status,
    pr.created_at,
    pr.expires_at,
    u.display_name as sender_display_name
  from public.payment_requests pr
  join public.users u on u.id = pr.sender_id;

grant select on public.payment_requests_public to anon, authenticated;
