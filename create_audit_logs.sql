-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for failed logins (no user ID yet)
    email TEXT, -- Capture email even if user_id is null (for failed attempts)
    action TEXT NOT NULL, -- 'LOGIN_FAILED', 'LOGIN_SUCCESS', 'ADMIN_ACCESS', 'CONFIG_CHANGE', 'record_deleted'
    details JSONB DEFAULT '{}'::jsonb, -- e.g. { "ip": "1.2.3.4", "reason": "wrong_password" }
    severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO'
);

-- 2. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- READ: Only Admin/SuperUser can read logs
CREATE POLICY "Enable read for Admins only" ON public.audit_logs
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'super_user')
    )
);

-- INSERT: Authenticated users can insert logs (e.g. valid login, logout, actions)
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id); 
-- wait, user_id might be null for failed login? No, authenticated insert implies a user.
-- But wait, what about failed login? That comes from unauthenticated client.
-- So we need a PUBLIC insert policy OR prefer the RPC function which bypasses RLS (SECURITY DEFINER).
-- Let's rely on RPC primarily for security events. But for app actions, authenticated insert is fine.
-- Update policy to allow authenticated users to log their own actions (user_id = uid)
-- Actually, let's keep it simple: Use RPC for everything to enforce consistency and server-side timestamp.

-- 4. RPC Function for Logging (SECURITY DEFINER to allow unauth usage for login failures)
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action TEXT,
    p_details JSONB,
    p_severity TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (postgres), bypassing RLS
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_user_id UUID;
    v_log_id UUID;
BEGIN
    -- Try to get current user ID if authenticated
    v_user_id := auth.uid();

    INSERT INTO public.audit_logs (user_id, email, action, details, severity)
    VALUES (v_user_id, p_email, p_action, p_details, p_severity)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Grant EXECUTE to public (anon) so Login page can log failures
GRANT EXECUTE ON FUNCTION public.log_security_event TO anon, authenticated, service_role;

-- 5. Index for filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
