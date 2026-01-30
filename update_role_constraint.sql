-- The error "violates check constraint" means the DB strictly forbids 'super_user'.
-- We need to update the allowed list of roles.

-- 1. Drop the old restriction
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add the new restriction including 'super_user'
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'inspector', 'client', 'super_user'));

-- 3. Now you can safely update your user
-- UPDATE public.profiles SET role = 'super_user' WHERE email = 'YOUR_EMAIL';
