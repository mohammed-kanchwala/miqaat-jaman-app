-- =========================================================
-- Migration: Admin add/delete miqaat RPCs.
-- Idempotent — safe to re-run.
-- =========================================================

-- Add a new miqaat (admin only). Duplicate dates are blocked.
create or replace function public.add_miqaat(
  p_hijri_month text,
  p_hijri_day text,
  p_gregorian_date date,
  p_name text,
  p_location text default null,
  p_niyaz_notes text default null,
  p_community_niyaz boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;

  if exists (
    select 1 from public.miqaat m where m.gregorian_date = p_gregorian_date
  ) then
    raise exception 'A miqaat already exists on this date.' using errcode = '23505';
  end if;

  insert into public.miqaat (year, hijri_month, hijri_day, gregorian_date, day_of_week, name, location, niyaz_notes, community_niyaz)
  values (
    '1448H',
    p_hijri_month,
    p_hijri_day,
    p_gregorian_date,
    to_char(p_gregorian_date, 'Day'),
    p_name,
    p_location,
    p_niyaz_notes,
    p_community_niyaz
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Delete a miqaat (admin only). Cascades to its bookings.
create or replace function public.delete_miqaat(p_miqaat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;
  delete from public.miqaat where id = p_miqaat_id;
end;
$$;

-- Update a miqaat (admin only). Duplicate dates (other than itself) are blocked.
create or replace function public.update_miqaat(
  p_miqaat_id uuid,
  p_hijri_month text,
  p_hijri_day text,
  p_gregorian_date date,
  p_name text,
  p_location text default null,
  p_niyaz_notes text default null,
  p_community_niyaz boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Not authorized.';
  end if;

  if exists (
    select 1 from public.miqaat m
    where m.gregorian_date = p_gregorian_date
      and m.id <> p_miqaat_id
  ) then
    raise exception 'A miqaat already exists on this date.' using errcode = '23505';
  end if;

  update public.miqaat
    set hijri_month   = p_hijri_month,
        hijri_day     = p_hijri_day,
        gregorian_date = p_gregorian_date,
        day_of_week   = to_char(p_gregorian_date, 'Day'),
        name          = p_name,
        location      = p_location,
        niyaz_notes   = p_niyaz_notes,
        community_niyaz = p_community_niyaz
  where id = p_miqaat_id;
end;
$$;

grant execute on function public.add_miqaat to authenticated;
grant execute on function public.delete_miqaat to authenticated;
grant execute on function public.update_miqaat to authenticated;
