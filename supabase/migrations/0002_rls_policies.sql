-- Migration 0002 — Row Level Security policies and SECURITY DEFINER state-transition functions.
-- All access rules live here at the database layer. Application code MUST trust RLS to reject illegal writes.

-- ─────────────────────────────────────────────────────────────
-- Enable RLS on every project-owned table
-- ─────────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_events enable row level security;

-- ─────────────────────────────────────────────────────────────
-- public.users
-- ─────────────────────────────────────────────────────────────

drop policy if exists users_self_or_counterparty_read on public.users;
create policy users_self_or_counterparty_read on public.users
  for select to authenticated using (
    id = (select auth.uid())
    or exists (
      select 1
        from public.payment_requests pr
       where (pr.sender_id = (select auth.uid()) or pr.recipient_id = (select auth.uid()))
         and (pr.sender_id = users.id or pr.recipient_id = users.id)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- public.payment_requests
-- ─────────────────────────────────────────────────────────────

drop policy if exists payment_requests_read on public.payment_requests;
create policy payment_requests_read on public.payment_requests
  for select to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

drop policy if exists payment_requests_insert_as_sender on public.payment_requests;
create policy payment_requests_insert_as_sender on public.payment_requests
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and sender_id <> recipient_id);

-- Recipient may transition pending → paid or declined
drop policy if exists payment_requests_update_pay_decline on public.payment_requests;
create policy payment_requests_update_pay_decline on public.payment_requests
  for update to authenticated
  using ((select auth.uid()) = recipient_id and status = 'pending')
  with check ((select auth.uid()) = recipient_id and status in ('paid','declined'));

-- Sender may transition pending → cancelled
drop policy if exists payment_requests_update_cancel on public.payment_requests;
create policy payment_requests_update_cancel on public.payment_requests
  for update to authenticated
  using ((select auth.uid()) = sender_id and status = 'pending')
  with check ((select auth.uid()) = sender_id and status = 'cancelled');

-- DELETE intentionally has no policy — blocked.

-- ─────────────────────────────────────────────────────────────
-- public.payment_events
-- ─────────────────────────────────────────────────────────────

drop policy if exists payment_events_read on public.payment_events;
create policy payment_events_read on public.payment_events
  for select to authenticated
  using (
    exists (
      select 1 from public.payment_requests pr
      where pr.id = payment_events.request_id
        and (select auth.uid()) in (pr.sender_id, pr.recipient_id)
    )
  );

-- INSERT/UPDATE/DELETE intentionally have no policy — blocked.
-- The SECURITY DEFINER functions below are the only write path.

-- ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER state-transition functions
-- ─────────────────────────────────────────────────────────────

create or replace function public.record_pay(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_found  boolean;
begin
  if v_caller is null then
    raise exception 'unauthenticated';
  end if;

  -- Lock and verify the request is pending and addressed to the caller
  select true into v_found
    from public.payment_requests
    where id = p_request_id
      and recipient_id = v_caller
      and status = 'pending'
    for update;

  if not coalesce(v_found, false) then
    raise exception 'not_pending_or_not_recipient';
  end if;

  -- Insert event; unique (request_id, event_type) guarantees idempotency
  begin
    insert into public.payment_events (request_id, event_type, actor_id)
      values (p_request_id, 'paid', v_caller);
  exception when unique_violation then
    return; -- already paid; idempotent success
  end;

  update public.payment_requests
    set status = 'paid'
    where id = p_request_id and status = 'pending';
end;
$$;

create or replace function public.record_decline(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_found  boolean;
begin
  if v_caller is null then
    raise exception 'unauthenticated';
  end if;

  select true into v_found
    from public.payment_requests
    where id = p_request_id
      and recipient_id = v_caller
      and status = 'pending'
    for update;

  if not coalesce(v_found, false) then
    raise exception 'not_pending_or_not_recipient';
  end if;

  begin
    insert into public.payment_events (request_id, event_type, actor_id)
      values (p_request_id, 'declined', v_caller);
  exception when unique_violation then
    return;
  end;

  update public.payment_requests
    set status = 'declined'
    where id = p_request_id and status = 'pending';
end;
$$;

create or replace function public.record_cancel(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_found  boolean;
begin
  if v_caller is null then
    raise exception 'unauthenticated';
  end if;

  select true into v_found
    from public.payment_requests
    where id = p_request_id
      and sender_id = v_caller
      and status = 'pending'
    for update;

  if not coalesce(v_found, false) then
    raise exception 'not_pending_or_not_sender';
  end if;

  begin
    insert into public.payment_events (request_id, event_type, actor_id)
      values (p_request_id, 'cancelled', v_caller);
  exception when unique_violation then
    return;
  end;

  update public.payment_requests
    set status = 'cancelled'
    where id = p_request_id and status = 'pending';
end;
$$;

-- Grant execute to authenticated users only
revoke all on function public.record_pay(uuid)     from public;
revoke all on function public.record_decline(uuid) from public;
revoke all on function public.record_cancel(uuid)  from public;
grant execute on function public.record_pay(uuid)     to authenticated;
grant execute on function public.record_decline(uuid) to authenticated;
grant execute on function public.record_cancel(uuid)  to authenticated;
