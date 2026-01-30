-- Add super_user to the allowed roles for viewing everything
-- We update the policy "Granular Read Access" on valve_records

-- Drop the old one first to be safe and clean
DROP POLICY IF EXISTS "Granular Read Access" ON public.valve_records;

CREATE POLICY "Granular Read Access"
ON public.valve_records
FOR SELECT
TO authenticated
USING (
  -- 1. Admin, Super User, and Inspectors can see everything
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('admin', 'super_user', 'inspector')
  ))
  OR
  -- 2. Clients can see if allowed_customers is 'all' (Case Insensitive)
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'client' AND allowed_customers ILIKE 'all'
  ))
  OR
  -- 3. Clients can see if any item in their comma-separated list matches the record's customer
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'client' 
    AND customer IS NOT NULL 
    AND EXISTS (
      SELECT 1 
      FROM unnest(string_to_array(allowed_customers, ',')) AS keyword
      WHERE keyword <> '' 
      AND public.valve_records.customer ILIKE '%' || trim(keyword) || '%'
    )
  ))
);

-- Also ensure INSERT/UPDATE/DELETE policies allow super_user if they exist
-- (Usually we have "Enable insert for authenticated users" or specific role checks)
-- Let's check generally for common pattern or just add a broad one for super_user if needed.
-- But since we don't have the full schema here, we assume standard checks rely on profile role.
-- If there are other policies like "Admins can delete", we should update them too.

-- Example for DELETE (if it exists)
-- DROP POLICY IF EXISTS "Admins can delete" ON public.valve_records;
-- CREATE POLICY "Admins can delete" ON public.valve_records FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_user')));
-- Since I don't know exact names, I will just apply the Read Access update which is the most critical for visibility.
-- Writing logic usually handled in code + generic 'authenticated' policy, but let's be safe.
