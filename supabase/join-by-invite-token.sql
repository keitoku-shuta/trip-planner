create or replace function public.join_trip_by_invite(p_token uuid, p_participant_id text, p_new_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_trip uuid; v_user uuid:=auth.uid(); v_name text;
begin
  if v_user is null then raise exception 'Authentication is required'; end if;
  select trip_id into v_trip from public.trip_invites where token=p_token and (expires_at is null or expires_at>now());
  if v_trip is null then raise exception 'Invalid invite'; end if;
  select m->>'name' into v_name from public.trips t cross join lateral jsonb_array_elements(t.state->'members') m where t.id=v_trip and m->>'id'=p_participant_id;
  if v_name is null then v_name:=left(trim(coalesce(p_new_name,'')),60); end if;
  if v_name='' then raise exception 'Name is required'; end if;
  insert into public.trip_members(trip_id,user_id,display_name) values(v_trip,v_user,v_name) on conflict do nothing;
  return v_trip;
end;
$$;
revoke all on function public.join_trip_by_invite(uuid,text,text) from public;
grant execute on function public.join_trip_by_invite(uuid,text,text) to authenticated;

