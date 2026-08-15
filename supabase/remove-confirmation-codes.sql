-- Run once in Supabase SQL Editor to remove the retired confirmation-code feature.
drop function if exists public.join_trip_with_confirmation_code(text);
drop function if exists public.create_participant_confirmation_code(uuid, text);
drop table if exists public.trip_participant_codes;

