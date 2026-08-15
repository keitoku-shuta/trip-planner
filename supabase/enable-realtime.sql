-- Run once in Supabase SQL Editor to broadcast trip updates to connected members.
alter publication supabase_realtime add table public.trips;

