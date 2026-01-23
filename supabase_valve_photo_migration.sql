-- Add valve_photo column to valve_records table
-- This stores the URL of the dedicated valve identification photo

ALTER TABLE valve_records 
ADD COLUMN IF NOT EXISTS valve_photo TEXT;

-- Add comment to document the column
COMMENT ON COLUMN valve_records.valve_photo IS 'URL of the primary valve identification photo (separate from general attachments)';
