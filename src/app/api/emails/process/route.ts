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
    console.log('Email processing API called');

    // Validate request with a simple API key for security
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.EMAIL_PROCESSOR_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('API key validation failed');
      console.log('Provided key:', apiKey ? '(present but not shown)' : '(missing)');
      console.log('Expected key exists:', !!expectedApiKey);

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
      console.log('No request body provided, using default params');
      params = {};
    }

    // Default to processing all users if no specific user is provided
    const specificEmail = params.email;
    console.log('Processing emails for', specificEmail ? `user: ${specificEmail}` : 'all users');

    try {
      // Get the Supabase client
      const supabase = getSupabaseClient();
      console.log('Supabase client initialized');

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
        console.log('No users found to process');
        return NextResponse.json(
          { message: 'No users found to process' },
          { status: 200 }
        );
      }

      console.log(`Found ${users.length} users to process`);

      // For each user, process their emails
      const results = [];

      for (const user of users) {
        try {
          // Skip users without email
          if (!user.email) {
            console.log(`User ${user.id} has no email, skipping`);
            results.push({
              userId: user.id,
              status: 'skipped',
              reason: 'No email address'
            });
            continue;
          }

          console.log(`Processing emails for user: ${user.email}`);

          // Get a valid access token for the user
          const accessToken = await getValidAccessToken(user.id);

          if (!accessToken) {
            console.log(`No access token available for user: ${user.email}`);
            results.push({
              userId: user.id,
              email: user.email,
              status: 'failed',
              reason: 'No access token available'
            });
            continue;
          }

          // Create Gmail client with access token
          try {
            console.log(`Creating Gmail client for user: ${user.email}`);
            const gmailClient = await createGmailClient(accessToken);

            // Fetch emails from Gmail
            console.log(`Fetching emails for user: ${user.email}`);
            const emails = await fetchEmails(gmailClient);
            console.log(`Retrieved ${emails.length} emails for user: ${user.email}`);

            // Store email data in user's table
            console.log(`Storing emails for user: ${user.email}`);
            await storeEmailData(user.email, emails);

            results.push({
              userId: user.id,
              email: user.email,
              status: 'success',
              emailsProcessed: emails.length
            });
          } catch (gmailError) {
            console.error(`Gmail API error for user ${user.email}:`, gmailError);
            results.push({
              userId: user.id,
              email: user.email,
              status: 'error',
              error: gmailError instanceof Error ? gmailError.message : 'Gmail API error'
            });
          }
        } catch (userError) {
          console.error(`Error processing emails for user ${user.id}:`, userError);
          results.push({
            userId: user.id,
            email: user.email,
            status: 'error',
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }

      console.log('Completed email processing for all users');
      return NextResponse.json({
        success: true,
        processedUsers: results.length,
        results
      });
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        {
          error: 'Database connection error',
          message: dbError instanceof Error ? dbError.message : 'Unknown database error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unhandled error in email processing API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
