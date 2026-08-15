-- Safe, atomic shared-trip creation for anonymous authenticated users.
create or replace function public.create_shared_trip(
  p_title text,
  p_research_consent boolean,
  p_state jsonb,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if char_length(trim(p_title)) = 0 or char_length(trim(p_display_name)) = 0 then
    raise exception 'Title and display name are required';
  end if;

  insert into public.trips (owner_id, title, research_consent, state)
  values (v_user_id, left(trim(p_title), 120), p_research_consent, p_state)
  returning id into v_trip_id;

  insert into public.trip_members (trip_id, user_id, display_name)
  values (v_trip_id, v_user_id, left(trim(p_display_name), 60));

  return v_trip_id;
end;
$$;

revoke all on function public.create_shared_trip(text, boolean, jsonb, text) from public;
grant execute on function public.create_shared_trip(text, boolean, jsonb, text) to authenticated;

