-- Secure RPC functions for Admin User Management

-- 1. Get All Profiles (Restricted to Admin/Super User)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permission: User must be admin or super_user
  IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_user')
  ) THEN
      -- Return all profiles
      RETURN QUERY SELECT * FROM public.profiles ORDER BY email;
  ELSE
      -- Raise exception or return empty
      RAISE EXCEPTION 'Access Denied: You do not have permission to view users.';
  END IF;
END;
$$;

-- 2. Update User (Restricted to Admin/Super User)
-- Replaces the direct table update which relies on RLS
CREATE OR REPLACE FUNCTION public.update_user_profile(
    target_user_id uuid,
    new_role text DEFAULT NULL,
    new_allowed_customers text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permission
  IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_user')
  ) THEN
      RAISE EXCEPTION 'Access Denied: You do not have permission to update users.';
  END IF;

  -- Perform Update
  UPDATE public.profiles
  SET 
    role = COALESCE(new_role, role),
    allowed_customers = COALESCE(new_allowed_customers, allowed_customers)
  WHERE id = target_user_id;

END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text) TO authenticated;
