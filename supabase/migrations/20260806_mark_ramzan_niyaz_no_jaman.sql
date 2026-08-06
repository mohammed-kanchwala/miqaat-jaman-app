-- =========================================================
-- Migration: Add community_niyaz concept.
-- Community niyaz days (e.g. Ramzan 19mi Aqa Moula TUS Niyaz
-- and 22mi Majmui Niyaz) have jaman — done by the whole
-- community — but cannot be claimed by a family. They stay
-- visible on the calendar, with no claim button.
-- Idempotent — safe to re-run.
-- =========================================================

-- 1. Add the community_niyaz column
alter table public.miqaat
  add column if not exists community_niyaz boolean not null default false;

-- 2. Recreate views to surface community_niyaz
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
       when m.community_niyaz then 'community_niyaz'
       when b.id is null then 'open'
       else 'taken' end as availability,
  b.status as booking_status
from public.miqaat m
left join public.booking b
  on b.miqaat_id = m.id and b.status <> 'cancelled';

create or replace view public.miqaat_status_admin as
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
       when m.community_niyaz then 'community_niyaz'
       when b.id is null then 'open'
       else 'taken' end as availability,
  b.status as booking_status,
  b.family_name
from public.miqaat m
left join public.booking b
  on b.miqaat_id = m.id and b.status <> 'cancelled';

-- 3. Block claiming on community niyaz days too
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
    where m.id = p_miqaat_id and (m.no_jaman or m.community_niyaz)
  ) then
    raise exception 'This miqaat is not claimable.';
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

-- 4. Mark the two Ramzan community niyaz days (they previously were
--    incorrectly marked no_jaman; now they're community niyaz)
update public.miqaat
set community_niyaz = true,
    no_jaman = false
where hijri_month = 'Shehre Ramzanul Moazzam'
  and hijri_day in ('19mi tarekh', '22mi tarekh')
  and gregorian_date in ('2027-02-24', '2027-02-27');
