-- =========================================================
-- Miqaat Jaman Booking App — Supabase/Postgres schema
-- Reflects PRD decisions: admin-only sponsor visibility,
-- self-service claim, cancellation-request-then-approve
-- (locked within 15 days of the miqaat), families access codes.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Tables
-- ---------------------------------------------------------

create table if not exists public.miqaat (
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

do $$ begin
  create type booking_status as enum ('booked', 'cancellation_requested', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.booking (
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
create unique index if not exists booking_active_miqaat_unique
on public.booking (miqaat_id)
where status <> 'cancelled';

create index if not exists booking_family_idx on public.booking (family_name);
create index if not exists booking_status_idx on public.booking (status);

-- ---------------------------------------------------------
-- Families — replaces the hardcoded JS array. Each family
-- gets an access code so "My Jaman" requires name + code.
-- The admin manages families via RPCs below.
-- ---------------------------------------------------------

create table if not exists public.family (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  access_code text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Public-safe view — status only, never sponsor identity.
-- This is what the anonymous/public calendar reads from.
-- ---------------------------------------------------------

create or replace view public.miqaat_status as
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

-- Public-safe view: family names only — never exposes access codes.
-- This is what the public/anonymous pages read from.
create or replace view public.family_names as
  select id, name from public.family order by name;

-- ---------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------

alter table public.miqaat enable row level security;
alter table public.booking enable row level security;
alter table public.family enable row level security;

-- Miqaat list is public read (dates/names aren't sensitive).
drop policy if exists "miqaat_read_all" on public.miqaat;
create policy "miqaat_read_all"
  on public.miqaat for select
  using (true);

-- The raw booking table (which holds family_name/contact) is NOT readable
-- by the anon role at all — only by an authenticated admin session.
-- Families interact with bookings exclusively through the RPCs below,
-- and read their own bookings through get_my_bookings() (SECURITY DEFINER),
-- never through a direct table SELECT.
drop policy if exists "booking_admin_select" on public.booking;
create policy "booking_admin_select"
  on public.booking for select
  using (auth.role() = 'authenticated');

drop policy if exists "booking_admin_update" on public.booking;
create policy "booking_admin_update"
  on public.booking for update
  using (auth.role() = 'authenticated');

drop policy if exists "booking_admin_delete" on public.booking;
create policy "booking_admin_delete"
  on public.booking for delete
  using (auth.role() = 'authenticated');

-- No direct public insert policy — inserts happen only via the
-- claim_miqaat() RPC below (SECURITY DEFINER bypasses RLS deliberately,
-- but only does exactly what that function allows).

-- family table: codes are sensitive — only admin (authenticated) can
-- see/change rows. The anon role interacts through the family_names
-- view and the access-code-validated RPCs.
drop policy if exists "family_admin_all" on public.family;
create policy "family_admin_all"
  on public.family for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

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

-- A family's own bookings, looked up by family_name + access_code.
-- The access_code validates that the caller is actually a member of
-- that family — prevents anyone from browsing another family's bookings.
-- Raises an exception if the code doesn't match.
drop function if exists public.get_my_bookings(text);
create or replace function public.get_my_bookings(
  p_family_name  text,
  p_access_code  text
)
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
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.family f
    where f.name = p_family_name and f.access_code = p_access_code
  ) then
    raise exception 'Invalid family name or access code.';
  end if;

  return query
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
end;
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
-- Admin RPCs — family management
-- ---------------------------------------------------------

-- List all families with their access codes (admin only).
create or replace function public.get_families()
returns table (id uuid, name text, access_code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;
  return query select f.id, f.name, f.access_code from public.family f order by f.name;
end;
$$;

-- Add a new family with an auto-generated 6-character uppercase access code.
create or replace function public.add_family(p_name text)
returns table (id uuid, name text, access_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;

  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.family (name, access_code)
  values (p_name, v_code)
  returning public.family.id, public.family.name, public.family.access_code
  into v_id, p_name, v_code;

  return query select v_id, p_name, v_code;
end;
$$;

-- Delete a family.
create or replace function public.delete_family(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;
  delete from public.family where id = p_family_id;
end;
$$;

-- Reset a family's access code (generates a new 6-char code).
create or replace function public.reset_access_code(p_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;

  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

  update public.family
    set access_code = v_code
  where id = p_family_id;

  return v_code;
end;
$$;

-- ---------------------------------------------------------
-- Grants
-- ---------------------------------------------------------

grant select on public.miqaat to anon, authenticated;
grant select on public.miqaat_status to anon, authenticated;
grant select on public.family_names to anon, authenticated;
grant execute on function public.claim_miqaat to anon, authenticated;
grant execute on function public.get_my_bookings to anon, authenticated;
grant execute on function public.request_cancellation to anon, authenticated;
grant execute on function public.approve_cancellation to authenticated;
grant execute on function public.reject_cancellation to authenticated;
grant execute on function public.get_families to authenticated;
grant execute on function public.add_family to authenticated;
grant execute on function public.delete_family to authenticated;
grant execute on function public.reset_access_code to authenticated;
-- Note: no grants on public.booking or public.family directly for anon — access
-- is only through RPCs, the miqaat_status view, and the family_names view.
