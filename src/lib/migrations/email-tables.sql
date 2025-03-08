-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the user_tokens table to store OAuth tokens
CREATE TABLE IF NOT EXISTS "user_tokens" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "expiry_date" BIGINT,
  "scope" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id")
);

-- Create a function to create tables for each user email
-- This is a helper function to be used by the application
CREATE OR REPLACE FUNCTION create_user_email_table(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  sanitized_email TEXT;
  table_name TEXT;
BEGIN
  -- Sanitize email to create a valid table name
  sanitized_email := LOWER(REPLACE(REPLACE(REPLACE(user_email, '@', '_'), '.', '_'), '-', '_'));
  table_name := 'email_' || sanitized_email;

  -- Create the table if it doesn't exist
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS "%s" (
      "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      "email_id" TEXT NOT NULL,
      "thread_id" TEXT,
      "from_address" TEXT,
      "to_address" TEXT,
      "subject" TEXT,
      "date" TIMESTAMP,
      "raw_content" TEXT,
      "processed" BOOLEAN DEFAULT false,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE("email_id")
    );
  ', table_name);
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies for user_tokens table
-- Enable RLS on the user_tokens table
ALTER TABLE "user_tokens" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read only their own tokens
CREATE POLICY "Users can read their own tokens" ON "user_tokens"
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Create policy to allow users to update only their own tokens
CREATE POLICY "Users can update their own tokens" ON "user_tokens"
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Create policy to allow users to insert their own tokens
CREATE POLICY "Users can insert their own tokens" ON "user_tokens"
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create policy to allow users to delete their own tokens
CREATE POLICY "Users can delete their own tokens" ON "user_tokens"
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Allow service role to manage all tokens (for background processing)
CREATE POLICY "Service role can manage all tokens" ON "user_tokens"
  USING (auth.jwt() ->> 'role' = 'service_role');
