-- ==========================================
-- Fix Valve Access & Assignment
-- Addresses issue where valves cannot be linked to jobs due to missing UPDATE policy
-- ==========================================

-- 1. Ensure RLS is enabled
ALTER TABLE public.valve_records ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential incomplete policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.valve_records;
DROP POLICY IF EXISTS "Granular Read Access" ON public.valve_records;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.valve_records;
DROP POLICY IF EXISTS "Inspectors and Admins can update valves" ON public.valve_records;

CREATE POLICY "Granular Read Access"
ON public.valve_records
FOR SELECT
TO authenticated
USING (
  -- Check if the user has access via their profile
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      -- 1. Admins and Inspectors see everything
      profiles.role IN ('admin', 'inspector', 'super_user')
      OR
      -- 2. Clients see their allowed customers
      (
        profiles.role = 'client'
        AND (
          profiles.allowed_customers ILIKE 'all'
          OR EXISTS (
            SELECT 1 FROM unnest(string_to_array(profiles.allowed_customers, ',')) AS keyword
            WHERE keyword <> '' 
            AND public.valve_records.customer ILIKE '%' || trim(keyword) || '%'
          )
        )
      )
    )
  )
);

-- 4. Create UPDATE Policy (Write) - CRITICAL FIX
-- Allows Admins and Inspectors to update records (e.g. assign jobs)
CREATE POLICY "Inspectors and Admins can update valves"
ON public.valve_records
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
)
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
);

-- 5. Create INSERT Policy (Create)
-- Ensure new valves can be created
DROP POLICY IF EXISTS "Inspectors and Admins can insert valves" ON public.valve_records;
CREATE POLICY "Inspectors and Admins can insert valves"
ON public.valve_records
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'inspector'))
);
