-- Secure RPC function to bypass RLS for role fetching

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.get_active_user_role()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- <--- CRITICAL: Bypasses RLS
SET search_path = public -- Secure search path
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Select role and allowed_customers for the current user
  SELECT to_jsonb(p) INTO result
  FROM public.profiles p
  WHERE p.id = auth.uid(); -- Only the calling user

  -- Return null if found (or json null)
  RETURN result;
END;
$$;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_active_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_user_role() TO service_role;
