-- Add Globe Control Valve specific fields to valve_records table

ALTER TABLE valve_records
ADD COLUMN IF NOT EXISTS actuator_serial TEXT,
ADD COLUMN IF NOT EXISTS actuator_make TEXT,
ADD COLUMN IF NOT EXISTS actuator_model TEXT,
ADD COLUMN IF NOT EXISTS actuator_type TEXT,
ADD COLUMN IF NOT EXISTS actuator_other TEXT,
ADD COLUMN IF NOT EXISTS actuator_size TEXT,
ADD COLUMN IF NOT EXISTS actuator_range TEXT,
ADD COLUMN IF NOT EXISTS actuator_travel TEXT,
ADD COLUMN IF NOT EXISTS positioner_model TEXT,
ADD COLUMN IF NOT EXISTS positioner_serial TEXT,
ADD COLUMN IF NOT EXISTS positioner_mode TEXT,
ADD COLUMN IF NOT EXISTS positioner_signal TEXT,
ADD COLUMN IF NOT EXISTS positioner_characteristic TEXT,
ADD COLUMN IF NOT EXISTS positioner_supply TEXT,
ADD COLUMN IF NOT EXISTS positioner_other TEXT,
ADD COLUMN IF NOT EXISTS regulator_model TEXT,
ADD COLUMN IF NOT EXISTS regulator_set_point TEXT;
