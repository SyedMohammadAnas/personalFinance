-- =====================================================
-- UPDATE TRANSACTION TABLES TO ALLOW MANUAL TRANSACTIONS
-- =====================================================

-- Function to update transaction tables to allow manual transactions
CREATE OR REPLACE FUNCTION update_transaction_tables_for_manual_entries()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    table_count INTEGER := 0;
BEGIN
    -- Loop through all users
    FOR user_record IN SELECT email FROM public.users LOOP
        -- Create a safe table name
        DECLARE
            safe_email TEXT := REPLACE(REPLACE(user_record.email, '@', '_'), '.', '_');
            table_name TEXT := 'transactions_' || safe_email;
        BEGIN
            -- Check if the table exists
            EXECUTE format('
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = ''public''
                        AND table_name = ''%1$s''
                    ) THEN
                        -- Alter the table to allow null values for user_id and email_id
                        ALTER TABLE public.%1$s
                        ALTER COLUMN user_id DROP NOT NULL,
                        ALTER COLUMN email_id DROP NOT NULL;

                        -- Remove the unique constraint on email_id to allow manual transactions
                        ALTER TABLE public.%1$s
                        DROP CONSTRAINT IF EXISTS %1$s_email_id_key;

                        -- Update RLS policy for manual transactions
                        DROP POLICY IF EXISTS "Users can access their own transactions" ON public.%1$s;
                        CREATE POLICY "Users can access their own transactions"
                        ON public.%1$s
                        FOR ALL
                        USING (
                            (user_id IS NULL) OR
                            (user_id = auth.uid())
                        );
                    END IF;
                END
                $$;', table_name);

            -- Increment counter
            table_count := table_count + 1;
        END;
    END LOOP;

    RETURN format('Updated %s transaction tables to allow manual transactions', table_count);
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update all existing transaction tables
SELECT update_transaction_tables_for_manual_entries();

-- Update the create_user_transaction_table function for future tables
CREATE OR REPLACE FUNCTION create_user_transaction_table(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    table_name TEXT;
    safe_email TEXT;
BEGIN
    -- Create a safe table name from email
    safe_email := REPLACE(REPLACE(user_email, '@', '_'), '.', '_');
    table_name := 'transactions_' || safe_email;

    -- Create the table with nullable user_id and email_id
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.%I (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT,  -- Nullable for manual transactions
            email_id TEXT,  -- Nullable for manual transactions
            amount DECIMAL(12,2) NOT NULL,
            name TEXT,
            date DATE NOT NULL,
            time TIME NOT NULL,
            transaction_type TEXT NOT NULL,
            tag TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

            -- Foreign key to users table (only if user_id is not null)
            CONSTRAINT fk_user
                FOREIGN KEY (user_id)
                REFERENCES public.users(id)
                ON DELETE CASCADE
        )', table_name);

    -- Enable RLS on the new table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Create RLS policy for the table - users can see their own data and manual entries
    EXECUTE format('
        CREATE POLICY "Users can access their own transactions"
        ON public.%I
        FOR ALL
        USING (
            (user_id IS NULL) OR
            (user_id = auth.uid())
        )', table_name);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', user_email;
END;
$$ LANGUAGE plpgsql;

-- Also update the trigger function
CREATE OR REPLACE FUNCTION create_user_transaction_table_trigger()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    safe_email TEXT;
BEGIN
    -- Create a safe table name from email
    safe_email := REPLACE(REPLACE(NEW.email, '@', '_'), '.', '_');
    table_name := 'transactions_' || safe_email;

    -- Create the table with nullable user_id and email_id
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.%I (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT,  -- Nullable for manual transactions
            email_id TEXT,  -- Nullable for manual transactions
            amount DECIMAL(12,2) NOT NULL,
            name TEXT,
            date DATE NOT NULL,
            time TIME NOT NULL,
            transaction_type TEXT NOT NULL,
            tag TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

            -- Foreign key to users table (only if user_id is not null)
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
        USING (
            (user_id IS NULL) OR
            (user_id = %L)
        )',
        table_name, table_name, NEW.id);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO anon', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log success
SELECT 'Transaction table schemas updated to allow manual transactions' as result;
