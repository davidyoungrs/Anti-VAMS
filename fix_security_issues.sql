-- ==========================================
-- Security Fixes for Anti-VAMS
-- Addresses RLS warnings and Function Security
-- ==========================================

-- 1. FIX: RLS for valve_history
-- Issue: Table was public with no RLS.
------------------------------------------------
ALTER TABLE public.valve_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history if they can view the parent valve record
CREATE POLICY "View history based on valve access"
ON public.valve_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.valve_records
    WHERE valve_records.id = valve_history.valve_id
  )
);

-- Policy: Allow authenticated users to insert history (needed for triggers)
-- Note: Triggers usually run with the privileges of the user executing the triggering statement.
CREATE POLICY "Allow history insert"
ON public.valve_history
FOR INSERT
TO authenticated
WITH CHECK (true);


-- 2. FIX: RLS for valve_inspections
-- Issue: Policies existed but RLS wasn't enabled on the table.
------------------------------------------------
ALTER TABLE public.valve_inspections ENABLE ROW LEVEL SECURITY;

-- Drop existing potential incomplete policies to be clean
DROP POLICY IF EXISTS "Enable read access for all users" ON public.valve_inspections;
DROP POLICY IF EXISTS "Enable insert for Inspector and Admin" ON public.valve_inspections;
DROP POLICY IF EXISTS "Enable update for Inspector and Admin" ON public.valve_inspections;
DROP POLICY IF EXISTS "Enable delete for Admin only" ON public.valve_inspections;
DROP POLICY IF EXISTS "Admins can maintain valve inspections" ON public.valve_inspections;
DROP POLICY IF EXISTS "Users can view valve inspections" ON public.valve_inspections;


-- Policy: Read Access (Mirroring valve_records: Admin/Inspector=All, Client=Owns Valve)
CREATE POLICY "Control read access for inspections"
ON public.valve_inspections
FOR SELECT
TO authenticated
USING (
  -- 1. Admin/Inspector
  (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector')))
  OR
  -- 2. Client (if they can see the parent valve)
  EXISTS (
    SELECT 1 FROM public.valve_records
    WHERE valve_records.id = valve_inspections.valve_id
  )
);

-- Policy: Insert (Admin/Inspector only)
CREATE POLICY "Control insert access for inspections"
ON public.valve_inspections
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
);

-- Policy: Update (Admin/Inspector only)
CREATE POLICY "Control update access for inspections"
ON public.valve_inspections
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
);

-- Policy: Delete (Admin only)
CREATE POLICY "Control delete access for inspections"
ON public.valve_inspections
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);


-- 3. FIX: RLS for valve_test_reports
-- Issue: Had an insecure "Enable all access" policy.
------------------------------------------------
ALTER TABLE public.valve_test_reports ENABLE ROW LEVEL SECURITY;

-- Drop the insecure policy
DROP POLICY IF EXISTS "Enable all access for all users" ON public.valve_test_reports;

-- Policy: Read Access (Mirroring permissions)
CREATE POLICY "Control read access for test reports"
ON public.valve_test_reports
FOR SELECT
TO authenticated
USING (
  -- 1. Admin/Inspector
  (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector')))
  OR
  -- 2. Client (if they can see the parent valve)
  EXISTS (
    SELECT 1 FROM public.valve_records
    WHERE valve_records.id = valve_test_reports.valve_id
  )
);

-- Policy: Write Access (Admin/Inspector only)
CREATE POLICY "Control write access for test reports"
ON public.valve_test_reports
FOR ALL
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
)
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
);


-- 4. FIX: Function Security (search_path)
-- Issue: Functions lacked a fixed search_path, posing a security risk.
------------------------------------------------

-- Secure handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Secure log_valve_history (if it exists)
-- Using DO block to avoid error if function doesn't exist yet
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_valve_history') THEN
        ALTER FUNCTION public.log_valve_history() SET search_path = public;
    END IF;
END $$;
