-- FIX for "Infinite Recursion" (42P17) in Policies
-- The issue is that the policy on 'profiles' queries 'profiles' itself, creating a loop.
-- Solution: Create a secure helper function to check roles that bypasses RLS.

-- 1. Create a helper function to check if a user is an admin/super_user
-- SECURITY DEFINER means it runs with the privileges of the creator (postgres/superuser), ignoring RLS.
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_user')
  );
$$;

-- 2. Drop the recursive policies AND any previous versions of the new ones
DROP POLICY IF EXISTS "Super User Can Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super User Can View Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin Update Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin View All Profiles" ON public.profiles;

-- 3. Re-create policies using the helper function (No recursion!)

-- UPDATE Policy
CREATE POLICY "Admin Update Profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- Check if the current user is admin using the secure function
  public.is_admin_or_super()
);

-- SELECT Policy (View)
CREATE POLICY "Admin View All Profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR
  -- Admins can see everyone
  public.is_admin_or_super()
);

-- 4. Fix Valve Records Policy (just in case it was also recursive via profiles)
-- Ensure valve_records also uses the function instead of querying profiles directly if possible.
-- (Assuming standard RLS for valve_records dependent on profiles)

DROP POLICY IF EXISTS "Admins can maintain valve records" ON public.valve_records;

CREATE POLICY "Admins can maintain valve records"
ON public.valve_records
FOR ALL
TO authenticated
USING (
  public.is_admin_or_super()
);

-- 5. Restore View for normal users (if needed)
DROP POLICY IF EXISTS "Users can view valve records" ON public.valve_records;

CREATE POLICY "Users can view valve records"
ON public.valve_records
FOR SELECT
TO authenticated
USING (
  true
);

-- 6. Fix Valve Inspections Policy
-- Similar to records, inspections might be blocked or recursive
DROP POLICY IF EXISTS "Admins can maintain valve inspections" ON public.valve_inspections;
DROP POLICY IF EXISTS "Users can view valve inspections" ON public.valve_inspections;

CREATE POLICY "Admins can maintain valve inspections"
ON public.valve_inspections
FOR ALL
TO authenticated
USING (
  public.is_admin_or_super()
);

CREATE POLICY "Users can view valve inspections"
ON public.valve_inspections
FOR SELECT
TO authenticated
USING (
  true
);
