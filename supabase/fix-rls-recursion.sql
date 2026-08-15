-- Fix trip_members RLS recursion. Run once in Supabase SQL Editor.
create or replace function public.is_trip_member(target_trip uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = target_trip and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

drop policy if exists "members can read trips" on public.trips;
drop policy if exists "members can update trips" on public.trips;
drop policy if exists "members can read member list" on public.trip_members;
drop policy if exists "members can read invites" on public.trip_invites;

create policy "members can read trips" on public.trips for select to authenticated
using (public.is_trip_member(id));

create policy "members can update trips" on public.trips for update to authenticated
using (public.is_trip_member(id))
with check (public.is_trip_member(id));

create policy "members can read member list" on public.trip_members for select to authenticated
using (public.is_trip_member(trip_id));

create policy "members can read invites" on public.trip_invites for select to authenticated
using (public.is_trip_member(trip_id));

