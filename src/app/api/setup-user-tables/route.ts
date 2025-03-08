/**
 * API Endpoint to create tables for all users in the database
 *
 * This endpoint scans the users table and creates the necessary email and transaction tables
 * for any users that don't have them yet.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeEmailForTableName } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    console.log('Setting up tables for all users');

    // Validate API key for security
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.EMAIL_PROCESSOR_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Unauthorized access attempt to setup-user-tables endpoint');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // Validate Supabase credentials
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users found' });
    }

    console.log(`Found ${users.length} users to process`);

    // Process each user
    const results = [];

    for (const user of users) {
      if (!user.email) {
        results.push({
          userId: user.id,
          status: 'skipped',
          reason: 'No email address'
        });
        continue;
      }

      try {
        console.log(`Processing tables for user ${user.email}`);

        // Create names for the user's tables
        const emailTableName = `email_${sanitizeEmailForTableName(user.email)}`;
        const transactionsTableName = `transactions_${sanitizeEmailForTableName(user.email)}`;

        // Check if email table exists
        let emailTableExists = false;
        try {
          const { error: emailTableError } = await supabase
            .from(emailTableName)
            .select('id')
            .limit(1);

          emailTableExists = !emailTableError;
        } catch (e) {
          // Table likely doesn't exist
        }

        // Check if transactions table exists
        let transactionsTableExists = false;
        try {
          const { error: transactionsTableError } = await supabase
            .from(transactionsTableName)
            .select('id')
            .limit(1);

          transactionsTableExists = !transactionsTableError;
        } catch (e) {
          // Table likely doesn't exist
        }

        // Create tables if they don't exist
        if (!emailTableExists) {
          console.log(`Creating email table ${emailTableName}`);
          const { error: createEmailError } = await supabase.rpc('execute_sql', {
            sql_string: `
              CREATE TABLE IF NOT EXISTS "${emailTableName}" (
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
            `
          });

          if (createEmailError) {
            console.error(`Error creating email table ${emailTableName}:`, createEmailError);
            results.push({
              userId: user.id,
              email: user.email,
              status: 'error',
              table: 'email',
              error: createEmailError.message
            });
            continue;
          }
        }

        if (!transactionsTableExists) {
          console.log(`Creating transactions table ${transactionsTableName}`);
          const { error: createTransactionsError } = await supabase.rpc('execute_sql', {
            sql_string: `
              CREATE TABLE IF NOT EXISTS "${transactionsTableName}" (
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
            `
          });

          if (createTransactionsError) {
            console.error(`Error creating transactions table ${transactionsTableName}:`, createTransactionsError);
            results.push({
              userId: user.id,
              email: user.email,
              status: 'error',
              table: 'transactions',
              error: createTransactionsError.message
            });
            continue;
          }
        }

        // Success
        results.push({
          userId: user.id,
          email: user.email,
          status: 'success',
          emailTableCreated: !emailTableExists,
          transactionsTableCreated: !transactionsTableExists
        });
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      results
    });
  } catch (error) {
    console.error('Error in setup-user-tables endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
