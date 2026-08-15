-- Trip Together: shared trip data (run once in Supabase SQL Editor)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null,
  research_consent boolean not null default false,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  display_name text not null check (char_length(display_name) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invites enable row level security;

create policy "members can read trips" on public.trips for select to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id = trips.id and m.user_id = (select auth.uid())));
create policy "members can update trips" on public.trips for update to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id = trips.id and m.user_id = (select auth.uid())))
with check (exists (select 1 from public.trip_members m where m.trip_id = trips.id and m.user_id = (select auth.uid())));
create policy "users can create trips" on public.trips for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "members can read member list" on public.trip_members for select to authenticated
using (exists (select 1 from public.trip_members mine where mine.trip_id = trip_members.trip_id and mine.user_id = (select auth.uid())));
create policy "owners can create member rows" on public.trip_members for insert to authenticated
with check ((select auth.uid()) = user_id or exists (select 1 from public.trips t where t.id = trip_members.trip_id and t.owner_id = (select auth.uid())));
create policy "members can read invites" on public.trip_invites for select to authenticated
using (exists (select 1 from public.trip_members m where m.trip_id = trip_invites.trip_id and m.user_id = (select auth.uid())));
create policy "members can create invites" on public.trip_invites for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.trip_members m where m.trip_id = trip_invites.trip_id and m.user_id = (select auth.uid())));

grant select, insert, update on public.trips to authenticated;
grant select, insert on public.trip_members to authenticated;
grant select, insert on public.trip_invites to authenticated;

