-- Create valve_inspections table for detailed component inspections
-- Each inspection is linked to a valve and contains detailed component data

CREATE TABLE IF NOT EXISTS valve_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  valve_id UUID REFERENCES valve_records(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  inspection_date DATE NOT NULL,
  inspector_name TEXT,
  
  -- Component inspection data stored as JSONB for flexibility
  -- Each component has: condition, action, partNumber, material, comments
  components JSONB DEFAULT '{}'::jsonb,
  
  -- Overall inspection notes
  repair_notes TEXT,
  overall_result TEXT, -- 'Pass', 'Fail', 'Conditional'
  
  -- Attachments
  inspection_photos TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Add index for faster lookups by valve_id
CREATE INDEX IF NOT EXISTS idx_valve_inspections_valve_id ON valve_inspections(valve_id);

-- Add index for inspection_date for chronological sorting
CREATE INDEX IF NOT EXISTS idx_valve_inspections_date ON valve_inspections(inspection_date DESC);

-- Add comments to document the schema
COMMENT ON TABLE valve_inspections IS 'Stores detailed component-by-component valve inspections';
COMMENT ON COLUMN valve_inspections.components IS 'JSONB object containing inspection data for 41+ valve components';
COMMENT ON COLUMN valve_inspections.inspection_photos IS 'Array of photo URLs from Supabase storage';
