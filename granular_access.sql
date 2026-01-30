-- 1. Add allowed_customers column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allowed_customers text DEFAULT '';

-- 2. Update RLS Policy for Select (Read Access)
-- Drop existing policy if it exists (to be safe, though usually we might just alter)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.valve_records;
DROP POLICY IF EXISTS "Granular Read Access" ON public.valve_records;

CREATE POLICY "Granular Read Access"
ON public.valve_records
FOR SELECT
TO authenticated
USING (
  -- 1. Admin and Inspectors can see everything
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('admin', 'inspector')
  ))
  OR
  -- 2. Clients can see if allowed_customers is 'all' (Case Insensitive)
  (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role = 'client' AND allowed_customers ILIKE 'all'
  ))
  OR
  -- 3. Clients can see if any item in their comma-separated list matches the record's customer
  -- Logic: Split allowed_customers into items, check if ANY item is a substring of the record's customer name.
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

-- Note: We assume 'customer' column in valve_records is the one we check against.
-- The ILIKE match is a bit loose (e.g. 'Gas' allows 'Oil & Gas'), but requested by user.
