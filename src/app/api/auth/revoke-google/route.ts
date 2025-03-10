/**
 * Google Authorization Revocation API
 *
 * This API endpoint handles revoking a user's Google Gmail authorization tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('Revoke authorization: Authentication required');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email.toLowerCase();
    console.log(`Revoking Google authorization for user: ${userEmail}`);

    // Get token table name (assuming tokens are stored per user)
    const safeEmail = userEmail.replace(/[@.]/g, '_');
    const tokenTableName = `tokens_${safeEmail}`;

    // Check if token table exists before trying to delete from it
    const { error: checkError } = await supabase
      .from(tokenTableName)
      .select('count')
      .limit(1);

    if (checkError) {
      console.log(`Token table not found or not accessible for user: ${userEmail}`);
      // If the table doesn't exist, we consider this a success as there are no tokens to revoke
      return NextResponse.json({
        success: true,
        message: 'No authorization tokens found to revoke.'
      });
    }

    // Delete all tokens from the user's token table
    const { error } = await supabase
      .from(tokenTableName)
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      console.error('Error deleting tokens:', error);
      return NextResponse.json(
        { error: 'Failed to revoke Google authorization' },
        { status: 500 }
      );
    }

    console.log(`Successfully revoked Google authorization for ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Google authorization successfully revoked'
    });
  } catch (error) {
    console.error('Error in revoke Google authorization route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
