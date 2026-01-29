
-- Enable Realtime for the valve_records table
-- This allows the 'subscribe()' listener in the app to receive events.

begin;
  -- Add the table to the 'supabase_realtime' publication
  -- This is often done via Dashboard, but this SQL does it programmatically.
  alter publication supabase_realtime add table valve_records;
commit;

-- Verify RLS ensures 'authenticated' users can see these changes
-- (Already handled in previous migration, but good to know)
