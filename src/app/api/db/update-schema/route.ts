/**
 * Database Schema Update API
 *
 * This API provides an endpoint to run SQL functions that update the database schema.
 * It's meant for admin use or one-time updates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication (only allow admin users in a real-world scenario)
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For security in a production environment, you should verify the user is an admin
    // This is just a simple example

    // Run the SQL function to update transaction tables
    const { data, error } = await supabase.rpc('update_transaction_tables_for_manual_entries');

    if (error) {
      console.error('Error updating transaction tables:', error);
      return NextResponse.json(
        { error: 'Failed to update transaction tables', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Transaction tables updated successfully', result: data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Server error updating transaction tables:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
