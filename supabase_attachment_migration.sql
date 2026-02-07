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
-- Run this in the SQL Editor to ensure nested folders (Record_ID/Category/File) are allowed.

-- This policy allows authenticated users to:
-- 1. Upload files to ANY folder in the 'valve-attachment' bucket.
-- 2. Read any file in that bucket.

BEGIN;

-- Drop existing generic policy if it conflicts (optional, adjust name as needed)
-- DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

CREATE POLICY "Allow authenticated full access to valve-attachment"
ON storage.objects FOR ALL 
TO authenticated 
USING (bucket_id = 'valve-attachment')
WITH CHECK (bucket_id = 'valve-attachment');

COMMIT;

-- VERIFICATION:
-- In the Supabase Dashboard, go to Storage -> Policies.
-- You should see "Allow authenticated full access to valve-attachment" under the 'Objects' table.
-- Because there is no "(storage.foldername(name))[1]" restriction, it will work for any depth.
