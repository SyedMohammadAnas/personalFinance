-- Create a function to execute arbitrary SQL
-- This is useful for operations that aren't directly supported by the Supabase JS client
CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_string;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create an email table for a specific user
CREATE OR REPLACE FUNCTION create_user_email_table(user_email TEXT, table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS "%s" (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email_id TEXT NOT NULL,
      thread_id TEXT,
      from_address TEXT,
      to_address TEXT,
      subject TEXT,
      date TIMESTAMP,
      raw_content TEXT,
      processed BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a transactions table for a specific user
CREATE OR REPLACE FUNCTION create_user_transactions_table(user_email TEXT, table_name TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS "%s" (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email_id TEXT NOT NULL UNIQUE,
      amount NUMERIC,
      name TEXT,
      date DATE,
      time TEXT,
      type TEXT,
      bank_name TEXT,
      category TEXT,
      raw_email TEXT,
      processed BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
