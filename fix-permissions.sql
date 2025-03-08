-- Fix Row Level Security (RLS) Permissions
-- Run this in the Supabase SQL Editor to fix permission issues

-- First drop all existing policies
DROP POLICY IF EXISTS "allow_select_users" ON public.users;
DROP POLICY IF EXISTS "allow_insert_users" ON public.users;
DROP POLICY IF EXISTS "allow_update_users" ON public.users;
DROP POLICY IF EXISTS "allow_delete_users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Updates allowed based on email" ON public.users;

-- Make sure RLS is enabled (required for policies to work)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create new permissive policies
-- SELECT policy - Allow anyone to read users
CREATE POLICY "allow_select_users"
ON public.users FOR SELECT
USING (true);

-- INSERT policy - Allow anyone to insert users
CREATE POLICY "allow_insert_users"
ON public.users FOR INSERT
WITH CHECK (true);

-- UPDATE policy - Allow anyone to update users
CREATE POLICY "allow_update_users"
ON public.users FOR UPDATE
USING (true);

-- DELETE policy - Allow deletion for testing/cleanup
CREATE POLICY "allow_delete_users"
ON public.users FOR DELETE
USING (true);

-- Grant permissions to all roles
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Force RLS to take effect
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Test insert to confirm permissions work
INSERT INTO public.users (id, email, name, image_url)
VALUES ('permission-test', 'permission-test@example.com', 'Permission Test', NULL)
ON CONFLICT (email) DO UPDATE
SET name = 'Permission Test Updated';

-- Select output to confirm success
SELECT 'Permissions successfully updated. RLS policies now allow all operations.' as result;
