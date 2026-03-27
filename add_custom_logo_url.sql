ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;

-- Update the secure RPC to handle the new field
CREATE OR REPLACE FUNCTION public.update_user_profile(
    target_user_id uuid,
    new_role text DEFAULT NULL,
    new_allowed_customers text DEFAULT NULL,
    new_custom_logo_url text DEFAULT NULL
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
    allowed_customers = COALESCE(new_allowed_customers, allowed_customers),
    custom_logo_url = COALESCE(new_custom_logo_url, custom_logo_url)
  WHERE id = target_user_id;

END;
$$;

-- 3. Update get_active_user_role to ensure it bypasses RLS for the new field
CREATE OR REPLACE FUNCTION public.get_active_user_role()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'role', p.role,
    'allowed_customers', p.allowed_customers,
    'custom_logo_url', p.custom_logo_url
  ) INTO result
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN result;
END;
$$;

-- 4. Permissions (Redundant but safe)
GRANT EXECUTE ON FUNCTION public.get_active_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text, text) TO authenticated;
