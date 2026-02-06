-- Function to fetch logs for archival
CREATE OR REPLACE FUNCTION public.get_logs_for_archival(p_retention_days INTEGER DEFAULT 365)
RETURNS TABLE (
    id UUID,
    timestamp TIMESTAMPTZ,
    user_id UUID,
    email TEXT,
    action TEXT,
    details JSONB,
    severity TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.timestamp, l.user_id, l.email, l.action, l.details, l.severity
    FROM public.audit_logs l
    WHERE l.timestamp < (now() - (p_retention_days || ' days')::interval);
END;
$$;

-- Function to delete logs after successful archival
CREATE OR REPLACE FUNCTION public.cleanup_archived_logs(p_log_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.audit_logs
    WHERE id = ANY(p_log_ids);
END;
$$;
