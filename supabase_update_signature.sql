-- Add signature fields to valve_records table
ALTER TABLE valve_records ADD COLUMN IF NOT EXISTS signature_data_url TEXT;
ALTER TABLE valve_records ADD COLUMN IF NOT EXISTS signed_by TEXT;
ALTER TABLE valve_records ADD COLUMN IF NOT EXISTS signed_date TIMESTAMPTZ;
