-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text check (role in ('admin', 'inspector', 'client')) default 'client',
  updated_at timestamp with time zone
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Function to handle new user signup automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client'); -- Default role is 'client'
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- BASIC RLS FOR valve_records
alter table valve_records enable row level security;

-- 1. READ: Everyone (authenticated) can read (Client, Inspector, Admin)
-- refine later if needed so Client only sees SOME records
create policy "Enable read access for all users"
on "public"."valve_records"
as PERMISSIVE
for SELECT
to authenticated
using (true);

-- 2. INSERT: Only Inspector and Admin
create policy "Enable insert for Inspector and Admin"
on "public"."valve_records"
for INSERT
to authenticated
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.role = 'admin' or profiles.role = 'inspector')
  )
);

-- 3. UPDATE: Only Inspector and Admin
create policy "Enable update for Inspector and Admin"
on "public"."valve_records"
for UPDATE
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and (profiles.role = 'admin' or profiles.role = 'inspector')
  )
);

-- 4. DELETE: Only Admin
create policy "Enable delete for Admin only"
on "public"."valve_records"
for DELETE
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
