-- =====================================================
-- TRIGGERS FOR AUTOMATIC TRANSACTION TABLE CREATION
-- =====================================================

-- Create a trigger function that will create a transaction table for each new user
CREATE OR REPLACE FUNCTION create_user_transaction_table_trigger()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    safe_email TEXT;
BEGIN
    -- Create a safe table name from email
    safe_email := REPLACE(REPLACE(NEW.email, '@', '_'), '.', '_');
    table_name := 'transactions_' || safe_email;

    -- Create the table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.%I (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT NOT NULL,  -- TEXT type to match users.id
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

    -- Create RLS policy for the table
    EXECUTE format('
        DROP POLICY IF EXISTS "Users can access their own transactions" ON public.%I;
        CREATE POLICY "Users can access their own transactions"
        ON public.%I
        FOR ALL
        USING (user_id = %L)',
        table_name, table_name, NEW.id);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO anon', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that will call our function whenever a new user is created
DROP TRIGGER IF EXISTS create_transaction_table_trigger ON public.users;
CREATE TRIGGER create_transaction_table_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION create_user_transaction_table_trigger();

-- Message to confirm trigger creation
SELECT 'Transaction table triggers created successfully. New users will automatically get transaction tables.' as result;
