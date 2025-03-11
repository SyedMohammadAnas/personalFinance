-- Function to update transaction tables to make user_id nullable
CREATE OR REPLACE FUNCTION update_transaction_tables_user_id()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
BEGIN
    -- Loop through all tables that start with 'transactions_'
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'transactions_%' AND schemaname = 'public'
    LOOP
        -- Drop the foreign key constraint
        EXECUTE format('
            ALTER TABLE public.%I
            DROP CONSTRAINT IF EXISTS fk_user',
            table_record.tablename
        );

        -- Change user_id to be nullable
        EXECUTE format('
            ALTER TABLE public.%I
            ALTER COLUMN user_id DROP NOT NULL',
            table_record.tablename
        );

        -- Update the RLS policy to allow access to rows with NULL user_id
        -- First drop the existing policy
        EXECUTE format('
            DROP POLICY IF EXISTS "Users can only access their own transactions"
            ON public.%I',
            table_record.tablename
        );

        -- Create a new policy that allows access to user's own transactions OR transactions with NULL user_id
        EXECUTE format('
            CREATE POLICY "Users can access their own or manual transactions"
            ON public.%I
            FOR ALL
            USING (user_id = auth.uid() OR user_id IS NULL)',
            table_record.tablename
        );

        RAISE NOTICE 'Updated table %', table_record.tablename;
    END LOOP;

    RAISE NOTICE 'All transaction tables updated to allow NULL user_id';
END;
$$ LANGUAGE plpgsql;

-- Run the function to update all transaction tables
SELECT update_transaction_tables_user_id();

-- Update the create_user_transaction_table function to create tables with nullable user_id
CREATE OR REPLACE FUNCTION create_user_transaction_table(user_email TEXT)
RETURNS VOID AS $$
DECLARE
    table_name TEXT;
    safe_email TEXT;
BEGIN
    -- Create a safe table name from email
    safe_email := REPLACE(REPLACE(user_email, '@', '_'), '.', '_');
    table_name := 'transactions_' || safe_email;

    -- Create the table with nullable user_id
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS public.%I (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id TEXT,  -- Changed to be nullable
            email_id TEXT NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            name TEXT,
            date DATE NOT NULL,
            time TIME NOT NULL,
            transaction_type TEXT NOT NULL,
            tag TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

            -- Unique constraint to avoid duplicate processing
            UNIQUE(email_id)
        )', table_name);

    -- Enable RLS on the new table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Create RLS policy for the table - users can access their own data or manual transactions
    EXECUTE format('
        CREATE POLICY "Users can access their own or manual transactions"
        ON public.%I
        FOR ALL
        USING (user_id = auth.uid() OR user_id IS NULL)', table_name);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', user_email;
END;
$$ LANGUAGE plpgsql;
