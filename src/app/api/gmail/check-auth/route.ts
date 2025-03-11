/**
 * Gmail Authorization Check API
 *
 * This API checks if the current user has authorized Gmail access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required', isAuthorized: false },
        { status: 401 }
      );
    }

    // Get the user's email
    const userEmail = session.user.email;

    // Query the oauth_tokens table to check if the user has a token
    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error checking Gmail authorization:', error);
      return NextResponse.json(
        {
          error: 'Failed to check authorization status',
          details: error.message,
          isAuthorized: false
        },
        { status: 500 }
      );
    }

    // Return the authorization status
    return NextResponse.json({
      isAuthorized: !!data,
      message: data ? 'Gmail is authorized' : 'Gmail is not authorized'
    });
  } catch (error) {
    console.error('Server error checking Gmail authorization:', error);
    return NextResponse.json(
      {
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        isAuthorized: false
      },
      { status: 500 }
    );
  }
}
