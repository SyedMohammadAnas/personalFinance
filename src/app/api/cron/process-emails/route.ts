/**
 * Cron Job Handler for Email Processing
 *
 * This endpoint is designed to be called by a cron job service (like Vercel Cron).
 * It triggers the email processing for all users at regular intervals.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Function to handle the cron job request
 * Can be called via GET by a cron service
 */
export async function GET(request: Request) {
  try {
    // Simple authorization check using a secret key
    const authHeader = request.headers.get('authorization');
    const expectedSecret = `Bearer ${process.env.CRON_SECRET_KEY}`;

    if (!authHeader || authHeader !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the email processing API internally
    const response = await fetch(new URL('/api/emails/process', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.EMAIL_PROCESSOR_API_KEY || ''
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error processing emails:', errorData);
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
    console.error('Error in cron job handler:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
