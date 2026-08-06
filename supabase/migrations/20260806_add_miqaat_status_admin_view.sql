-- =========================================================
-- Migration: Add admin-only miqaat_status_admin view.
-- Same as miqaat_status but with the sponsor family name.
-- Only granted to the authenticated role, so anonymous
-- visitors never see sponsor identity.
-- Idempotent — safe to re-run.
-- =========================================================

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
       when b.id is null then 'open'
       else 'taken' end as availability,
  b.status as booking_status,  -- 'booked' or 'cancellation_requested'; null if open
  b.family_name                -- null if open / no jaman
from public.miqaat m
left join public.booking b
  on b.miqaat_id = m.id and b.status <> 'cancelled';

grant select on public.miqaat_status_admin to authenticated;
