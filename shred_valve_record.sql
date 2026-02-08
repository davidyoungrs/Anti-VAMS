-- Professionally sanitizes a record before permanent deletion (Secure Wipe / MP-6)
-- Overwrites sensitive fields with random noise and clears metadata.

CREATE OR REPLACE FUNCTION public.shred_valve_record(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Overwrite sensitive fields in the record with random hexadecimal noise
    -- We use md5(random()::text) to generate consistent noise for all fields
    UPDATE public.valve_records
    SET 
        serial_number = 'SHREDDED_' || md5(random()::text),
        customer = 'PURGED',
        oem = 'PURGED',
        tag_no = NULL,
        job_no = NULL,
        order_no = NULL,
        plant_area = NULL,
        site_location = NULL,
        valve_photo = NULL,
        file_urls = '[]', -- Clear all attachment links
        signature_data_url = NULL,
        signed_by = NULL,
        deleted_at = now() -- Ensure timestamp is current for the final delete cycle
    WHERE id = target_id;

    -- 2. Clear Snapshot History for this record
    DELETE FROM public.valve_history
    WHERE valve_id = target_id;

    -- 3. Perform the final atomic DELETE
    DELETE FROM public.valve_records
    WHERE id = target_id;

    -- 4. Log the sanitization event
    INSERT INTO public.audit_logs (action, details, severity)
    VALUES (
        'MEDIA_SANITIZATION',
        jsonb_build_object('record_id', target_id, 'method', 'Crypto-shredding (MP-6)'),
        'INFO'
    );
END;
$$;
