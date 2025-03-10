/**
 * Transaction Processing API
 *
 * This API endpoint handles the processing of emails to extract transaction data.
 * It:
 * 1. Reads emails from the user's Gmail
 * 2. Parses the emails to extract transaction data
 * 3. Stores the transaction data in the user's transaction table
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createGmailClient, fetchEmails, EmailData } from '@/lib/gmail';
import { getSupabaseClient } from '@/lib/supabase';
import { getValidAccessToken } from '@/lib/token-manager';
import { parseEmailContent, storeTransactionData, ensureUserTransactionTable } from '@/lib/email-parser';

export async function POST(request: Request) {
  try {
    // Get the current session to identify the user
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    console.log(`Processing emails for user: ${userEmail}`);

    // Get the user's Gmail access token
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail access not authorized - Please authorize Gmail access' },
        { status: 403 }
      );
    }

    // Create a Gmail client with the user's access token
    const gmailClient = await createGmailClient(accessToken);

    // Ensure the transaction table exists for this user
    await ensureUserTransactionTable(userEmail);

    // Fetch HDFC bank emails - use a more specific query to target HDFC bank emails
    const query = 'from:hdfc OR from:hdfcbank OR subject:hdfc OR subject:bank OR subject:transaction OR subject:payment';
    const emails = await fetchEmails(gmailClient, 100, query);

    // No emails found
    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No HDFC bank emails found to process',
        processedEmails: 0,
        transactions: 0
      });
    }

    // Process each email
    const results = {
      total: emails.length,
      processed: 0,
      transactionsFound: 0,
      transactions: [] as any[]
    };

    for (const email of emails) {
      try {
        // Parse the email to extract transaction data
        const transaction = await parseEmailContent(email);

        if (transaction) {
          // Store the transaction in the user's transaction table
          const stored = await storeTransactionData(userId, userEmail, transaction);

          if (stored) {
            results.transactionsFound++;
            results.transactions.push({
              emailId: email.id,
              subject: email.subject,
              amount: transaction.amount,
              name: transaction.name,
              date: transaction.date,
              transactionType: transaction.transactionType
            });
          }
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        // Continue with the next email even if there was an error
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} out of ${results.total} emails`,
      foundTransactions: results.transactionsFound,
      transactions: results.transactions
    });
  } catch (error) {
    console.error('Error in transaction processing API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
