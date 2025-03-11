-- Function to update all existing transaction tables to make user_id and email_id nullable
CREATE OR REPLACE FUNCTION update_transaction_tables_schema()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
BEGIN
    -- Loop through all tables that match our transaction table naming pattern
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'transactions_%'
    LOOP
        -- Alter the table to allow NULL values for user_id and email_id
        EXECUTE format('
            ALTER TABLE public.%I
            ALTER COLUMN user_id DROP NOT NULL,
            ALTER COLUMN email_id DROP NOT NULL',
            table_record.table_name
        );

        -- Also make description and tag nullable if they exist
        BEGIN
            EXECUTE format('
                ALTER TABLE public.%I
                ALTER COLUMN description DROP NOT NULL,
                ALTER COLUMN tag DROP NOT NULL',
                table_record.table_name
            );
            RAISE NOTICE 'Made description and tag nullable for table: %', table_record.table_name;
        EXCEPTION WHEN undefined_column THEN
            RAISE NOTICE 'Description or tag columns do not exist for table: %', table_record.table_name;
        END;

        -- Update the RLS policy to account for NULL user_id
        EXECUTE format('
            DROP POLICY IF EXISTS "Users can access their own transactions" ON public.%I;
            CREATE POLICY "Users can access their own transactions"
            ON public.%I
            FOR ALL
            USING (user_id = auth.uid()::TEXT OR user_id IS NULL)',
            table_record.table_name, table_record.table_name
        );

        RAISE NOTICE 'Updated schema for table: %', table_record.table_name;
    END LOOP;

    RAISE NOTICE 'All transaction tables updated successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to update all existing tables
SELECT update_transaction_tables_schema();

-- Update the table creation functions to create nullable columns
-- First, update the one-time creation function
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
            user_id TEXT,  -- Nullable
            email_id TEXT,  -- Nullable
            amount DECIMAL(12,2) NOT NULL,
            name TEXT,
            date DATE NOT NULL,
            time TIME NOT NULL,
            transaction_type TEXT NOT NULL,
            description TEXT,  -- Nullable
            tag TEXT,  -- Nullable
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

            -- Unique constraint removed since email_id can be NULL
            -- Foreign key maintains referential integrity when user_id is not NULL
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
        USING (user_id = auth.uid()::TEXT OR user_id IS NULL)', table_name);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', user_email;
END;
$$ LANGUAGE plpgsql;

-- Then, update the trigger function
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
            user_id TEXT,  -- Nullable
            email_id TEXT,  -- Nullable
            amount DECIMAL(12,2) NOT NULL,
            name TEXT,
            date DATE NOT NULL,
            time TIME NOT NULL,
            transaction_type TEXT NOT NULL,
            description TEXT,  -- Nullable
            tag TEXT,  -- Nullable
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

            -- Unique constraint removed since email_id can be NULL
            -- Foreign key maintains referential integrity when user_id is not NULL
            CONSTRAINT fk_user
                FOREIGN KEY (user_id)
                REFERENCES public.users(id)
                ON DELETE CASCADE
        )', table_name);

    -- Enable RLS on the new table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Create RLS policy for the table - users can see their own data and manual entries
    EXECUTE format('
        DROP POLICY IF EXISTS "Users can access their own transactions" ON public.%I;
        CREATE POLICY "Users can access their own transactions"
        ON public.%I
        FOR ALL
        USING (user_id = auth.uid()::TEXT OR user_id IS NULL)',
        table_name, table_name);

    -- Grant permissions
    EXECUTE format('GRANT ALL ON public.%I TO anon', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

    RAISE NOTICE 'Created transaction table for %', NEW.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove the unique constraint on email_id from existing tables
CREATE OR REPLACE FUNCTION remove_email_unique_constraints()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
    constraint_name TEXT;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'transactions_%'
    LOOP
        -- Try to drop the unique constraint if it exists
        BEGIN
            EXECUTE format('
                ALTER TABLE public.%I
                DROP CONSTRAINT IF EXISTS %I_email_id_key',
                table_record.table_name, table_record.table_name
            );
            RAISE NOTICE 'Removed unique constraint on email_id for table: %', table_record.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No unique constraint to remove for table: %', table_record.table_name;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT remove_email_unique_constraints();

-- Add description and tag columns to tables that might not have them
CREATE OR REPLACE FUNCTION add_missing_columns()
RETURNS VOID AS $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'transactions_%'
    LOOP
        -- Add description column if it doesn't exist
        BEGIN
            EXECUTE format('
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = ''public''
                        AND table_name = ''%I''
                        AND column_name = ''description''
                    ) THEN
                        ALTER TABLE public.%I ADD COLUMN description TEXT;
                    END IF;
                END$$;
            ', table_record.table_name, table_record.table_name);

            -- Add tag column if it doesn't exist
            EXECUTE format('
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = ''public''
                        AND table_name = ''%I''
                        AND column_name = ''tag''
                    ) THEN
                        ALTER TABLE public.%I ADD COLUMN tag TEXT;
                    END IF;
                END$$;
            ', table_record.table_name, table_record.table_name);

            RAISE NOTICE 'Checked and added any missing columns for table: %', table_record.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error adding columns to table %: %', table_record.table_name, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT add_missing_columns();

-- Message to confirm schema updates
SELECT 'Transaction table schemas updated to allow manual entries with NULL user_id and email_id' as result;
