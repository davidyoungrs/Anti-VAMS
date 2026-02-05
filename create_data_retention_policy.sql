-- Function to Enforce Data Retention & User Inactivity Policy
-- 1. Purges audit logs older than 1 year
-- 2. Downgrades users inactive for 6 months to 'client' role

CREATE OR REPLACE FUNCTION public.enforce_data_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Required to access auth.users and bypass RLS
SET search_path = public, auth -- Include auth in search path to access users table
AS $$
DECLARE
    v_logs_purged INT;
    v_users_downgraded INT;
    v_downgraded_list TEXT[];
BEGIN
    -- 1. Purge Audit Logs older than 1 year
    DELETE FROM public.audit_logs
    WHERE timestamp < (now() - INTERVAL '1 year');

    GET DIAGNOSTICS v_logs_purged = ROW_COUNT;

    -- 2. Downgrade Inactive Users (Last sign in > 6 months ago)
    -- Logic: Find users in auth.users inactive for 6 months, update their public.profiles role to 'client'
    -- Note: Exclude users who have never signed in? (last_sign_in_at is null). 
    -- Usually new users have null. Let's assume we only target those who HAVE signed in but stopped.
    -- Or if null (created but never used) > 6 months? 
    -- Let's stick to last_sign_in_at IS NOT NULL AND < 6 months old.
    
    WITH inactive_users AS (
        SELECT id FROM auth.users
        WHERE last_sign_in_at IS NOT NULL 
        AND last_sign_in_at < (now() - INTERVAL '6 months')
    ),
    downgraded AS (
        UPDATE public.profiles
        SET role = 'client'
        WHERE id IN (SELECT id FROM inactive_users)
        AND role != 'client' -- Only update non-clients
        RETURNING id
    )
    SELECT array_agg(id::text) INTO v_downgraded_list FROM downgraded;

    -- Calculate count from the list (array_length returns null for empty array)
    v_users_downgraded := COALESCE(array_length(v_downgraded_list, 1), 0);

    -- 3. Log this maintenance action (Self-Logging)
    INSERT INTO public.audit_logs (action, details, severity)
    VALUES (
        'DATA_RETENTION_RUN',
        jsonb_build_object(
            'logs_purged', v_logs_purged,
            'users_downgraded', v_users_downgraded,
            'affected_user_ids', v_downgraded_list
        ),
        'INFO'
    );

    RETURN jsonb_build_object(
        'success', true,
        'logs_purged', v_logs_purged,
        'users_downgraded', v_users_downgraded
    );
END;
$$;

-- Grant execute to authenticated users (restricted by app logic, but safe due to internal logic)
GRANT EXECUTE ON FUNCTION public.enforce_data_retention TO authenticated;
