-- Create System Settings Table for Global Configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES auth.users(id)
);

-- Turn on RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can READ settings (needed for enforcement)
CREATE POLICY "Everyone can read system settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- Policy: Only Super Users can UPDATE settings
-- Note: Requires 'get_active_user_role' RPC or similar logic. 
-- For simplicity, we can use the profiles table check if RPC is complex to invoke here.
CREATE POLICY "Super Users can update system settings"
ON public.system_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_user'
    )
);

-- Insert Default Emergency Mode (if not exists)
INSERT INTO public.system_settings (key, value)
VALUES ('emergency_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
