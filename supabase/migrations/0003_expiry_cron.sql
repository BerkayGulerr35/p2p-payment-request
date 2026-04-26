-- Migration 0003 — hourly expiry job using pg_cron.
-- Pending requests whose expires_at has passed are flipped to 'expired'
-- and an immutable 'expired' payment_event is recorded.

-- pg_cron is provided by Supabase; the extension lives in the `extensions` schema.
create extension if not exists pg_cron with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- public.run_expiry_sweep — single-pass expiry function
-- ─────────────────────────────────────────────────────────────

create or replace function public.run_expiry_sweep()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Record an 'expired' event for each newly-expiring pending request.
  -- The unique (request_id, event_type) constraint protects against duplicates.
  insert into public.payment_events (request_id, event_type, actor_id)
    select id, 'expired', null
      from public.payment_requests
     where status = 'pending'
       and expires_at < now()
    on conflict (request_id, event_type) do nothing;

  -- Flip statuses
  update public.payment_requests
     set status = 'expired'
   where status = 'pending'
     and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.run_expiry_sweep() from public;
-- Only the postgres role (used by pg_cron) and service_role can invoke this.

-- ─────────────────────────────────────────────────────────────
-- Schedule the hourly job (idempotent: replaces an existing one with the same name)
-- ─────────────────────────────────────────────────────────────

-- Unschedule any prior version of this job before re-scheduling
do $$
begin
  if exists (select 1 from cron.job where jobname = 'p2p-expiry-hourly') then
    perform cron.unschedule('p2p-expiry-hourly');
  end if;
end $$;

select cron.schedule(
  'p2p-expiry-hourly',
  '0 * * * *',
  $cmd$ select public.run_expiry_sweep(); $cmd$
);
