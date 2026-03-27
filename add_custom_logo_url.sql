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
