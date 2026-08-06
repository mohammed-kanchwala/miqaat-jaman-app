-- =========================================================
-- Migration: Mark Safarul Muzaffar 16mi tarekh (16mi Darees)
-- as "No Jaman" and remove Dr. Saifuddin Rangwala's booking.
-- Idempotent — safe to re-run.
-- =========================================================

-- 1. Add the no_jaman column (if it doesn't already exist)
alter table public.miqaat
  add column if not exists no_jaman boolean not null default false;

-- 2. Recreate the miqaat_status view to surface no_jaman
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
  case when m.no_jaman then 'no_jaman'
       when b.id is null then 'open'
       else 'taken' end as availability,
  b.status as booking_status
from public.miqaat m
left join public.booking b
  on b.miqaat_id = m.id and b.status <> 'cancelled';

-- 3. Block claiming on no-jaman days (idempotent create or replace)
create or replace function public.claim_miqaat(
  p_miqaat_id uuid,
  p_family_name text,
  p_access_code text,
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
  if not exists (
    select 1 from public.family f
    where f.name = p_family_name and f.access_code = p_access_code
  ) then
    raise exception 'Invalid family name or access code.';
  end if;

  if exists (
    select 1 from public.miqaat m
    where m.id = p_miqaat_id and m.no_jaman
  ) then
    raise exception 'There is no jaman on this day.';
  end if;

  insert into public.booking (miqaat_id, family_name, contact, headcount_estimate, notes, status)
  values (p_miqaat_id, p_family_name, p_contact, p_headcount, p_notes, 'booked')
  returning id into v_booking_id;

  return v_booking_id;
exception
  when unique_violation then
    raise exception 'This miqaat has already been taken.' using errcode = '23505';
end;
$$;

-- 4. Delete Dr. Saifuddin Rangwala's booking for the 16mi Darees miqaat
delete from public.booking
where family_name = 'Dr. Saifuddin Rangwala'
  and miqaat_id in (
    select m.id from public.miqaat m
    where m.hijri_month = 'Safarul Muzaffar'
      and m.hijri_day = '16mi tarekh'
      and m.gregorian_date = '2026-07-30'
  );

-- 5. Mark the miqaat as no jaman
update public.miqaat
set no_jaman = true,
    niyaz_notes = null
where hijri_month = 'Safarul Muzaffar'
  and hijri_day = '16mi tarekh'
  and gregorian_date = '2026-07-30';
