-- Allow super_user to update any profile (e.g., change roles)

-- 1. Create a policy for UPDATE on profiles
-- (Note: There might be an existing one, usually "Users can update own profile". We need a new one.)

DROP POLICY IF EXISTS "Super User Can Update Profiles" ON public.profiles;

CREATE POLICY "Super User Can Update Profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- The user DOING the update must be a super_user or admin
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('super_user', 'admin')
  )
)
WITH CHECK (
  -- Optional: Ensure they don't do something crazy? 
  -- Usually USING clause is sufficient for permission.
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('super_user', 'admin')
  )
);

-- 2. Also ensure SELECT policy allows them to see profiles (Usually admins can see all)
-- Assuming "Admins can see all profiles" exists. If not, add super_user to it.
-- Let's add a safe one.
DROP POLICY IF EXISTS "Super User Can View Profiles" ON public.profiles;

CREATE POLICY "Super User Can View Profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
   auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE role IN ('super_user', 'admin')
  )
);
