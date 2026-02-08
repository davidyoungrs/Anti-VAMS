-- ==========================================
-- Fix RLS Infinite Recursion (AbortError)
-- Breaks loops in profiles and valve_records policies
-- ==========================================

-- 1. Create Security Definer Helper Functions
-- These bypass RLS locally to check permissions without recursing.

-- Helper: Check if current user is an admin/inspector/super_user
CREATE OR REPLACE FUNCTION public.is_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Bypasses RLS
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('admin', 'inspector', 'super_user')
  );
$$;

-- Helper: Get allowed_customers for a user safely
CREATE OR REPLACE FUNCTION public.get_user_allowed_customers(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT allowed_customers FROM public.profiles
  WHERE id = user_id;
$$;


-- 2. Update Profiles Policy
-- Uses is_staff helper to check permissions without recursing into the profiles table SELECT policy.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super User Can View Profiles" ON public.profiles;

CREATE POLICY "Profile Read Access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() -- Everyone can see their own profile
  OR
  public.is_staff(auth.uid()) -- Staff can see all profiles
);


-- 3. Update Valve Records SELECT Policy
-- Re-optimizing to use the safe helpers and avoid subqueries that trigger recursion.
DROP POLICY IF EXISTS "Granular Read Access" ON public.valve_records;

CREATE POLICY "Granular Read Access"
ON public.valve_records
FOR SELECT
TO authenticated
USING (
  -- 1. Staff see everything
  public.is_staff(auth.uid())
  OR
  -- 2. Clients see their allowed customers
  EXISTS (
    SELECT 1
    WHERE EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role = 'client'
    )
    AND (
      public.get_user_allowed_customers(auth.uid()) ILIKE 'all'
      OR EXISTS (
        SELECT 1 FROM unnest(string_to_array(public.get_user_allowed_customers(auth.uid()), ',')) AS keyword
        WHERE keyword <> '' 
        AND public.valve_records.customer ILIKE '%' || trim(keyword) || '%'
      )
    )
  )
);

-- Note: We also need to ensure the UPDATE/INSERT policies are secure
DROP POLICY IF EXISTS "Inspectors and Admins can update valves" ON public.valve_records;
CREATE POLICY "Inspectors and Admins can update valves"
ON public.valve_records
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Inspectors and Admins can insert valves" ON public.valve_records;
CREATE POLICY "Inspectors and Admins can insert valves"
ON public.valve_records
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));
