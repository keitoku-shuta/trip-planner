-- Capability-style invite links: the random token, not the trip ID, is shared.
create or replace function public.create_trip_invite(p_trip_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_token uuid;
begin
  if not public.is_trip_member(p_trip_id) then raise exception 'Not a trip member'; end if;
  insert into public.trip_invites(trip_id,created_by) values(p_trip_id,auth.uid()) returning token into v_token;
  return v_token;
end;
$$;

create or replace function public.get_trip_join_options(p_token uuid)
returns table (trip_title text, participant_id text, participant_name text)
language sql stable security definer set search_path = public as $$
  select t.title, m->>'id', m->>'name'
  from public.trip_invites i join public.trips t on t.id=i.trip_id
  cross join lateral jsonb_array_elements(coalesce(t.state->'members','[]'::jsonb)) m
  where i.token=p_token and (i.expires_at is null or i.expires_at>now());
$$;
revoke all on function public.create_trip_invite(uuid) from public;
revoke all on function public.get_trip_join_options(uuid) from public;
grant execute on function public.create_trip_invite(uuid) to authenticated;
grant execute on function public.get_trip_join_options(uuid) to authenticated;

