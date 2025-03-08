-- =====================================================
-- COMPREHENSIVE SUPABASE SETUP FOR NEXTAUTH INTEGRATION
-- =====================================================

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop table if it exists for clean setup
DROP TABLE IF EXISTS public.users;

-- Create the users table with proper constraints
-- NOTE: id is TEXT type for compatibility with OAuth providers
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,               -- TEXT type matches OAuth ID format
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image_url TEXT
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- SELECT policy - Allow anyone to read users
DROP POLICY IF EXISTS "allow_select_users" ON public.users;
CREATE POLICY "allow_select_users"
ON public.users FOR SELECT
USING (true);

-- INSERT policy - Allow anyone to insert users
DROP POLICY IF EXISTS "allow_insert_users" ON public.users;
CREATE POLICY "allow_insert_users"
ON public.users FOR INSERT
WITH CHECK (true);

-- UPDATE policy - Allow anyone to update users
DROP POLICY IF EXISTS "allow_update_users" ON public.users;
CREATE POLICY "allow_update_users"
ON public.users FOR UPDATE
USING (true);

-- DELETE policy - Allow deletion for testing/cleanup
DROP POLICY IF EXISTS "allow_delete_users" ON public.users;
CREATE POLICY "allow_delete_users"
ON public.users FOR DELETE
USING (true);

-- Grant permissions to all roles
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);

-- For debugging: Insert a test user
INSERT INTO public.users (id, email, name, image_url)
VALUES
  ('test-user', 'test@example.com', 'Test User', 'https://via.placeholder.com/150')
ON CONFLICT (email) DO
  UPDATE SET name = 'Test User Updated';

-- Output success message in query results
SELECT 'Users table setup complete! The table exists and has proper permissions.' as result;
