/**
 * User Transactions API
 *
 * Retrieves parsed transaction data from a user's transaction table.
 * Requires authentication to ensure users can only access their own data.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';
import { getTransactionsTableNameFromEmail, ensureUserTransactionsTable } from '@/lib/email-processor';

export async function GET(request: Request) {
  try {
    // Get the current authenticated session
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's email
    const userEmail = session.user.email;
    console.log(`Fetching transactions for user: ${userEmail}`);

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort = url.searchParams.get('sort') || 'transaction_date';
    const order = url.searchParams.get('order') || 'desc';

    // Ensure transaction table exists
    const tableExists = await ensureUserTransactionsTable(userEmail);
    if (!tableExists) {
      return NextResponse.json(
        {
          error: 'Transaction table not found',
          transactions: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          }
        },
        { status: 200 } // Return 200 with empty data rather than an error
      );
    }

    // Get table name for user transactions
    const tableName = getTransactionsTableNameFromEmail(userEmail);
    console.log(`Using transactions table: ${tableName}`);

    // Get Supabase client
    const supabase = getSupabaseClient();

    try {
      // First check if the table exists by trying to get a single row
      const { error: tableCheckError } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (tableCheckError) {
        console.error('Error checking table:', tableCheckError);

        // If table doesn't exist, return empty results
        if (tableCheckError.message.includes('does not exist')) {
          return NextResponse.json({
            transactions: [],
            pagination: {
              total: 0,
              limit,
              offset,
              hasMore: false
            }
          });
        }

        throw tableCheckError;
      }

      // Get transactions
      const { data: transactions, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .order(sort, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      // Return transactions (even if empty array)
      return NextResponse.json({
        transactions: transactions || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      });
    } catch (error: any) {
      console.error('Database error details:', error);

      // Return empty data for table not found errors
      if (error.message && typeof error.message === 'string' && error.message.includes('does not exist')) {
        return NextResponse.json({
          transactions: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          }
        });
      }

      return NextResponse.json(
        {
          error: `Database error: ${error.message || 'Unknown error'}`,
          details: error
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in transactions API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Processes any unprocessed emails for the current user
 */
export async function POST(request: Request) {
  try {
    console.log('Processing emails for user');

    // Get the current authenticated session
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's email
    const userEmail = session.user.email;
    console.log(`Processing emails for user: ${userEmail}`);

    // Trigger email processing specifically for this user
    try {
      const response = await fetch(new URL('/api/emails/process', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EMAIL_PROCESSOR_API_KEY || ''
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Email processing error:', errorData);
        return NextResponse.json(
          { error: 'Failed to process emails', details: errorData },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('Email processing result:', result);

      return NextResponse.json({
        success: true,
        message: 'Email processing completed',
        details: result
      });
    } catch (fetchError) {
      console.error('Fetch error during email processing:', fetchError);
      return NextResponse.json(
        {
          error: 'Error calling email processing API',
          message: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in email processing endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
