-- Fix RLS Recursion on Profiles Table

-- 1. Allow users to ALWAYS read their own profile
-- This is critical so they can fetch their own 'role' to permit other actions.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- 2. Allow Admin/Super User to read ALL profiles (for User Management)
-- Re-apply this to be sure, using OR logic if needed, but separate policies are fine.
DROP POLICY IF EXISTS "Super User Can View Profiles" ON public.profiles;

CREATE POLICY "Super User Can View Profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- To avoid infinite recursion, we trust the 'Users can read own profile' allows the subquery
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_user')
  )
);

-- 3. Allow Admin/Super User to UPDATE profiles
DROP POLICY IF EXISTS "Super User Can Update Profiles" ON public.profiles;

CREATE POLICY "Super User Can Update Profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_user')
  )
);
