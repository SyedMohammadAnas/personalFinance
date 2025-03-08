/**
 * Email Processing API Endpoint
 *
 * This API endpoint handles processing emails for users.
 * It can be triggered periodically to read new emails from users' Gmail accounts
 * and store them in their respective Supabase tables.
 */

import { NextResponse } from 'next/server';
import { createGmailClient, fetchEmails } from '@/lib/gmail';
import { storeEmailData } from '@/lib/email-processor';
import { getSupabaseClient } from '@/lib/supabase';
import { getValidAccessToken } from '@/lib/token-manager';

// API route handler for processing emails
export async function POST(request: Request) {
  try {
    // Validate request with a simple API key for security
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.EMAIL_PROCESSOR_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract parameters from request body
    let params;
    try {
      params = await request.json();
    } catch (e) {
      params = {};
    }

    // Default to processing all users if no specific user is provided
    const specificEmail = params.email;

    // Get the Supabase client
    const supabase = getSupabaseClient();

    // Get all users or a specific user
    let usersQuery = supabase.from('users').select('id, email');

    if (specificEmail) {
      usersQuery = usersQuery.eq('email', specificEmail);
    }

    const { data: users, error } = await usersQuery;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { message: 'No users found to process' },
        { status: 200 }
      );
    }

    // For each user, process their emails
    const results = [];

    for (const user of users) {
      try {
        // Skip users without email
        if (!user.email) {
          results.push({
            userId: user.id,
            status: 'skipped',
            reason: 'No email address'
          });
          continue;
        }

        // Get a valid access token for the user
        const accessToken = await getValidAccessToken(user.id);

        if (!accessToken) {
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            reason: 'No access token available'
          });
          continue;
        }

        // Create Gmail client with access token
        const gmailClient = await createGmailClient(accessToken);

        // Fetch emails from Gmail
        const emails = await fetchEmails(gmailClient);

        // Store email data in user's table
        await storeEmailData(user.email, emails);

        results.push({
          userId: user.id,
          email: user.email,
          status: 'success',
          emailsProcessed: emails.length
        });
      } catch (error) {
        console.error(`Error processing emails for user ${user.id}:`, error);
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
      processedUsers: results.length,
      results
    });
  } catch (error) {
    console.error('Error in email processing API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
