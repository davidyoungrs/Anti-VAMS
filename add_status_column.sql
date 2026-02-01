-- Ensure 'status' column exists in valve_records
ALTER TABLE public.valve_records
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Booked in';

-- Add index for performance (since we filter/chart by it)
CREATE INDEX IF NOT EXISTS idx_valve_records_status ON public.valve_records(status);
