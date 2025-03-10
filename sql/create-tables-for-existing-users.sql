-- =====================================================
-- CREATE TRANSACTION TABLES FOR EXISTING USERS
-- =====================================================

-- Function to create transaction tables for all existing users
CREATE OR REPLACE FUNCTION create_transaction_tables_for_existing_users()
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    table_count INTEGER := 0;
BEGIN
    -- Loop through all users
    FOR user_record IN SELECT id, email FROM public.users LOOP
        -- Create a safe table name
        DECLARE
            safe_email TEXT := REPLACE(REPLACE(user_record.email, '@', '_'), '.', '_');
            table_name TEXT := 'transactions_' || safe_email;
        BEGIN
            -- Create the table if it doesn't exist
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS public.%I (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id TEXT NOT NULL,
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

            -- Enable RLS on the table
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

            -- Create RLS policy
            EXECUTE format('
                DROP POLICY IF EXISTS "Users can access their own transactions" ON public.%I;
                CREATE POLICY "Users can access their own transactions"
                ON public.%I
                FOR ALL
                USING (user_id = %L)',
                table_name, table_name, user_record.id);

            -- Grant permissions
            EXECUTE format('GRANT ALL ON public.%I TO anon', table_name);
            EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_name);
            EXECUTE format('GRANT ALL ON public.%I TO service_role', table_name);

            -- Increment counter
            table_count := table_count + 1;
        END;
    END LOOP;

    RETURN format('Created %s transaction tables for existing users', table_count);
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create tables for existing users
SELECT create_transaction_tables_for_existing_users();
