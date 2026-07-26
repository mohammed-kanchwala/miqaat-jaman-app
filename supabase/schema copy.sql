-- =========================================================
-- Miqaat Jaman Booking App — Supabase/Postgres schema
-- Reflects PRD decisions: admin-only sponsor visibility,
-- self-service claim, cancellation-request-then-approve
-- (locked within 15 days of the miqaat), no auth for families.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Tables
-- ---------------------------------------------------------

create table public.miqaat (
  id            uuid primary key default gen_random_uuid(),
  year          text not null default '1448H',
  hijri_month   text not null,          -- e.g. 'Shawwal ul Mukarram'
  hijri_day     text not null,          -- e.g. '16 tarikh'
  gregorian_date date not null,
  day_of_week   text not null,
  name          text not null,          -- occasion name
  location      text,
  niyaz_notes   text,
  created_at    timestamptz not null default now()
);

create type booking_status as enum ('booked', 'cancellation_requested', 'cancelled');

create table public.booking (
  id                          uuid primary key default gen_random_uuid(),
  miqaat_id                   uuid not null references public.miqaat(id) on delete cascade,
  family_name                 text not null,
  contact                     text,
  headcount_estimate          int,
  notes                       text,
  status                      booking_status not null default 'booked',
  created_at                  timestamptz not null default now(),
  cancellation_requested_at   timestamptz,
  cancelled_at                timestamptz,
  admin_notes                 text
);

-- Enforce exclusivity: only one *active* (non-cancelled) booking per miqaat.
-- This is what actually guarantees "once taken, no one else can take it" —
-- not the UI.
create unique index booking_active_miqaat_unique
  on public.booking (miqaat_id)
  where status <> 'cancelled';

create index booking_family_idx on public.booking (family_name);
create index booking_status_idx on public.booking (status);

-- ---------------------------------------------------------
-- Public-safe view — status only, never sponsor identity.
-- This is what the anonymous/public calendar reads from.
-- ---------------------------------------------------------

create view public.miqaat_status as
select
  m.id,
  m.year,
  m.hijri_month,
  m.hijri_day,
  m.gregorian_date,
  m.day_of_week,
  m.name,
  m.location,
  m.niyaz_notes,
  case when b.id is null then 'open' else 'taken' end as availability,
  b.status as booking_status  -- 'booked' or 'cancellation_requested'; null if open
from public.miqaat m
left join public.booking b
  on b.miqaat_id = m.id and b.status <> 'cancelled';

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------

alter table public.miqaat enable row level security;
alter table public.booking enable row level security;

-- Miqaat list is public read (dates/names aren't sensitive).
create policy "miqaat_read_all"
  on public.miqaat for select
  using (true);

-- The raw booking table (which holds family_name/contact) is NOT readable
-- by the anon role at all — only by an authenticated admin session.
-- Families interact with bookings exclusively through the RPCs below,
-- and read their own bookings through get_my_bookings() (SECURITY DEFINER),
-- never through a direct table SELECT.
create policy "booking_admin_select"
  on public.booking for select
  using (auth.role() = 'authenticated');

create policy "booking_admin_update"
  on public.booking for update
  using (auth.role() = 'authenticated');

create policy "booking_admin_delete"
  on public.booking for delete
  using (auth.role() = 'authenticated');

-- No direct public insert policy — inserts happen only via the
-- claim_miqaat() RPC below (SECURITY DEFINER bypasses RLS deliberately,
-- but only does exactly what that function allows).

-- ---------------------------------------------------------
-- RPCs — these are the only way the public/anon role touches bookings.
-- Keeping the logic server-side (not trusted to the client) is what
-- makes "self-service, no admin needed to claim" safe.
-- ---------------------------------------------------------

-- Claim a miqaat. Fails cleanly if it's already taken (unique index).
create or replace function public.claim_miqaat(
  p_miqaat_id uuid,
  p_family_name text,
  p_contact text default null,
  p_headcount int default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  insert into public.booking (miqaat_id, family_name, contact, headcount_estimate, notes, status)
  values (p_miqaat_id, p_family_name, p_contact, p_headcount, p_notes, 'booked')
  returning id into v_booking_id;

  return v_booking_id;
exception
  when unique_violation then
    raise exception 'This miqaat has already been taken.' using errcode = '23505';
end;
$$;

-- A family's own bookings, looked up by family_name (no auth model for
-- families, so this trusts the name picked from the known-families dropdown —
-- acceptable at ~12-family internal-community scale).
create or replace function public.get_my_bookings(p_family_name text)
returns table (
  booking_id uuid,
  miqaat_id uuid,
  hijri_month text,
  hijri_day text,
  gregorian_date date,
  name text,
  status booking_status,
  created_at timestamptz,
  cancellation_requested_at timestamptz,
  days_until_miqaat int
)
language sql
security definer
set search_path = public
as $$
  select
    b.id,
    m.id,
    m.hijri_month,
    m.hijri_day,
    m.gregorian_date,
    m.name,
    b.status,
    b.created_at,
    b.cancellation_requested_at,
    (m.gregorian_date - current_date)::int
  from public.booking b
  join public.miqaat m on m.id = b.miqaat_id
  where b.family_name = p_family_name
    and b.status <> 'cancelled'
  order by m.gregorian_date;
$$;

-- Request cancellation. Enforces the 15-day cutoff server-side so it
-- can't be bypassed from the client.
create or replace function public.request_cancellation(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gregorian_date date;
  v_status booking_status;
begin
  select m.gregorian_date, b.status
    into v_gregorian_date, v_status
  from public.booking b
  join public.miqaat m on m.id = b.miqaat_id
  where b.id = p_booking_id;

  if v_status is null then
    raise exception 'Booking not found.';
  end if;

  if v_status <> 'booked' then
    raise exception 'This booking cannot have a cancellation requested right now.';
  end if;

  if (v_gregorian_date - current_date) < 15 then
    raise exception 'Cancellations are not allowed within 15 days of the miqaat.';
  end if;

  update public.booking
    set status = 'cancellation_requested',
        cancellation_requested_at = now()
  where id = p_booking_id;
end;
$$;

-- Admin approves a cancellation request — reopens the miqaat.
create or replace function public.approve_cancellation(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;

  update public.booking
    set status = 'cancelled',
        cancelled_at = now()
  where id = p_booking_id
    and status = 'cancellation_requested';
end;
$$;

-- Admin rejects a cancellation request — booking stays active.
create or replace function public.reject_cancellation(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;

  update public.booking
    set status = 'booked',
        admin_notes = p_reason
  where id = p_booking_id
    and status = 'cancellation_requested';
end;
$$;

-- ---------------------------------------------------------
-- Grants
-- ---------------------------------------------------------

grant select on public.miqaat to anon, authenticated;
grant select on public.miqaat_status to anon, authenticated;
grant execute on function public.claim_miqaat to anon, authenticated;
grant execute on function public.get_my_bookings to anon, authenticated;
grant execute on function public.request_cancellation to anon, authenticated;
grant execute on function public.approve_cancellation to authenticated;
grant execute on function public.reject_cancellation to authenticated;
-- Note: no grants on public.booking directly for anon — access is only
-- through the RPCs and the miqaat_status view.
