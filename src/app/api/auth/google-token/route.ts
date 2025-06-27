/**
 * Google OAuth Token Handler
 *
 * This endpoint handles the callback from Google OAuth authorization
 * to store the access and refresh tokens for a user.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { OAuth2Client } from 'google-auth-library';
import { storeTokens } from '@/lib/token-manager';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user || !session.user.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Get the authorization code from the query params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Create OAuth client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${url.origin}/api/auth/google-token`
    );

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Store the tokens
    const result = await storeTokens(session.user.id, {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope
    });

    if (!result) {
      console.error('Failed to store tokens for user:', session.user.id);
      return NextResponse.redirect(new URL('/error?message=Failed+to+store+tokens', request.url));
    }

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error in Google token endpoint:', error);

    // Redirect to error page
    return NextResponse.redirect(
      new URL(
        `/error?message=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`,
        request.url
      )
    );
  }
}

export async function POST(request: Request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();

    if (!body || !body.code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Create OAuth client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      body.redirect_uri || new URL('/api/auth/google-token', request.url).toString()
    );

    // Exchange the code for tokens
    const { tokens } = await oauth2Client.getToken(body.code);

    // Store the tokens
    const result = await storeTokens(session.user.id, {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to store tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OAuth tokens stored successfully'
    });
  } catch (error) {
    console.error('Error in Google token endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
