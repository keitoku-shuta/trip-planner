create table if not exists public.trip_participant_codes (
  trip_id uuid not null references public.trips(id) on delete cascade,
  participant_id text not null,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now(),
  primary key (trip_id, participant_id)
);
alter table public.trip_participant_codes enable row level security;

create or replace function public.create_participant_confirmation_code(p_trip_id uuid, p_participant_id text)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_trip_member(p_trip_id) then raise exception 'Not a trip member'; end if;
  select code into v_code from public.trip_participant_codes where trip_id=p_trip_id and participant_id=p_participant_id;
  if v_code is not null then return v_code; end if;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text),1,6));
    begin
      insert into public.trip_participant_codes(trip_id,participant_id,code) values(p_trip_id,p_participant_id,v_code);
      return v_code;
    exception when unique_violation then end;
  end loop;
end;
$$;

create or replace function public.join_trip_with_confirmation_code(p_code text)
returns table (trip_id uuid, participant_id text)
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_name text;
begin
  if v_user is null then raise exception 'Authentication is required'; end if;
  select c.trip_id,c.participant_id into trip_id,participant_id from public.trip_participant_codes c where c.code=upper(trim(p_code));
  if trip_id is null then raise exception 'Invalid confirmation code'; end if;
  select m->>'name' into v_name from public.trips t cross join lateral jsonb_array_elements(t.state->'members') m where t.id=trip_id and m->>'id'=participant_id;
  insert into public.trip_members(trip_id,user_id,display_name) values(trip_id,v_user,coalesce(v_name,'参加者')) on conflict do nothing;
  return next;
end;
$$;

revoke all on function public.create_participant_confirmation_code(uuid,text) from public;
revoke all on function public.join_trip_with_confirmation_code(text) from public;
grant execute on function public.create_participant_confirmation_code(uuid,text) to authenticated;
grant execute on function public.join_trip_with_confirmation_code(text) to authenticated;

