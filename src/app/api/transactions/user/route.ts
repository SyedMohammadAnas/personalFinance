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
import { getTransactionsTableNameFromEmail } from '@/lib/email-processor';

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

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort = url.searchParams.get('sort') || 'transaction_date';
    const order = url.searchParams.get('order') || 'desc';

    // Get table name for user transactions
    const tableName = getTransactionsTableNameFromEmail(userEmail);

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Get transactions
    const { data: transactions, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json(
        { error: 'Error fetching transactions' },
        { status: 500 }
      );
    }

    // Return transactions
    return NextResponse.json({
      transactions,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });
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

    // Trigger email processing specifically for this user
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
      return NextResponse.json(
        { error: 'Failed to process emails', details: errorData },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Email processing completed',
      details: result
    });
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
