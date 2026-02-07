-- 1. Upgrade file_urls to JSONB to support categorized metadata
-- This script converts text[] to jsonb safely to support the new metadata structure:
-- { "url": "...", "category": "...", "originalName": "...", "uploadDate": "..." }

DO $$ 
BEGIN
    -- Only convert if it's currently an array or text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'valve_records' 
        AND column_name = 'file_urls' 
        AND data_type = 'ARRAY'
    ) THEN
        -- 1. Drop existing default to avoid casting errors
        ALTER TABLE public.valve_records ALTER COLUMN file_urls DROP DEFAULT;
        
        -- 2. Convert type with explicit cast
        ALTER TABLE public.valve_records 
        ALTER COLUMN file_urls TYPE jsonb USING to_jsonb(file_urls);
        
        -- 3. Set new JSONB-compatible default
        ALTER TABLE public.valve_records ALTER COLUMN file_urls SET DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Converted file_urls from array to jsonb.';
    ELSE
        RAISE NOTICE 'file_urls is already jsonb or compatible.';
    END IF;
END $$;

-- 2. Storage Policy Recommendation
-- Ensure your 'valve-attachment' bucket RLS allows the new folder structure.
-- The new path format is: record_id/Category/filename.ext

-- If your current policy is path-restricted, ensure it uses 'starts with' logic:
-- Example (DO NOT RUN BLINDLY, tailored for your RLS):
-- USING (bucket_id = 'valve-attachment' AND (storage.foldername(name))[1] IS NOT NULL)
