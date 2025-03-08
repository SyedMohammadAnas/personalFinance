-- Function to create a transaction table for each user
CREATE OR REPLACE FUNCTION create_user_transaction_table(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    table_name TEXT;
    safe_email TEXT;
BEGIN
    -- Create a safe table name from email
    safe_email := REPLACE(REPLACE(user_email, '@', '_'), '.', '_');
    table_name := 'transactions_' || safe_email;

    -- Create the table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.%I (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT NOT NULL,  -- Changed from UUID to TEXT to match users.id
            email_id TEXT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            name TEXT,
            date DATE NOT NULL,
            time TIME NOT NULL,
            transaction_type TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

            -- Unique constraint to avoid duplicate processing
            UNIQUE(email_id),

            -- Foreign key to users table
            CONSTRAINT fk_user
                FOREIGN KEY (user_id)
                REFERENCES public.users(id)
                ON DELETE CASCADE
        )', table_name);

    -- Enable RLS on the new table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Create RLS policy for the table - users can only see their own data
    EXECUTE format('
        CREATE POLICY "Users can only access their own transactions"
        ON public.%I
        FOR ALL
        USING (user_id = auth.uid())', table_name);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', user_email;
END;
$$ LANGUAGE plpgsql;

-- Test the function with an example
SELECT create_user_transaction_table('permission_test@example.com');
