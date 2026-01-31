-- Add deleted_at column to valve_records table to support soft deletes
ALTER TABLE public.valve_records
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index to improve performance of filtering non-deleted records
CREATE INDEX IF NOT EXISTS idx_valve_records_deleted_at ON public.valve_records(deleted_at);

-- Verify for valve_inspections too, just in case
ALTER TABLE public.valve_inspections
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_valve_inspections_deleted_at ON public.valve_inspections(deleted_at);
