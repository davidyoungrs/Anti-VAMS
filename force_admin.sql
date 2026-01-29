-- Force Role Update to 'admin' to unblock RLS
-- Replace the UUID below with your User ID: 2e85d5fd-ebfc-4c88-9577-085c2d77c21a

update public.profiles
set role = 'admin'
where id = '2e85d5fd-ebfc-4c88-9577-085c2d77c21a';

-- Verify
select * from public.profiles where id = '2e85d5fd-ebfc-4c88-9577-085c2d77c21a';
