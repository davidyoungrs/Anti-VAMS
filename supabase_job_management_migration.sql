-- ALL COMMANDS IN ONE SQL BLOCK

-- 1. Create the 'jobs' table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_name TEXT,
    status TEXT DEFAULT 'Active', -- 'Active', 'Archived'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add 'job_id' to 'valve_records'
ALTER TABLE public.valve_records 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

-- 3. Enable RLS on 'jobs'
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for 'jobs'

-- Read: Everyone (authenticated) can read jobs
CREATE POLICY "Enable read access for all users" ON public.jobs
FOR SELECT TO authenticated USING (true);

-- Insert: Only Inspector and Admin
CREATE POLICY "Enable insert for Inspector and Admin" ON public.jobs
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'inspector')
    )
);

-- Update: Only Inspector and Admin
CREATE POLICY "Enable update for Inspector and Admin" ON public.jobs
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'inspector')
    )
);

-- Delete: Only Admin
CREATE POLICY "Enable delete for Admin only" ON public.jobs
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_valve_records_job_id ON public.valve_records(job_id);
