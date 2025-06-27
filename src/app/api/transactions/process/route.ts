/**
 * Transaction Processing API
 *
 * This API endpoint handles the processing of emails to extract transaction data.
 * It:
 * 1. Reads emails from the user's Gmail
 * 2. Parses the emails to extract transaction data
 * 3. Stores the transaction data in the user's transaction table
 */

export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createGmailClient, fetchEmails } from '@/lib/gmail';
import { getValidAccessToken } from '@/lib/token-manager';
import { parseEmailContent, storeTransactionData, ensureUserTransactionTable } from '@/lib/email-parser';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST() {
  try {
    // Get the current session to identify the user
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const safeEmail = userEmail.toLowerCase().replace(/[@.]/g, '_');
    const tableName = `transactions_${safeEmail}`;
    const supabase = getSupabaseClient();

    // --- LAST CHECK LOGIC: Find the last checked transaction ---
    let lastCheckedDate = null;
    let lastCheckedTime = null;
    let lastCheckedTimestamp = null;
    let lastCheckedRow = null;
    const { data: lastCheckedRows, error: lastCheckedError } = await supabase
      .from(tableName)
      .select('date, time')
      .eq('last_check', 'last checked')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(1);
    if (lastCheckedError) {
      console.error('Error fetching last checked transaction:', lastCheckedError);
    }
    if (lastCheckedRows && lastCheckedRows.length > 0) {
      lastCheckedRow = lastCheckedRows[0];
      lastCheckedDate = lastCheckedRow.date;
      lastCheckedTime = lastCheckedRow.time;
      // Combine date and time into a JS Date object for comparison
      lastCheckedTimestamp = new Date(`${lastCheckedDate}T${lastCheckedTime}`);
    }

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

    // --- Fetch emails efficiently using Gmail API 'after:' query ---
    let query = 'from:hdfc OR from:hdfcbank OR subject:hdfc OR subject:bank OR subject:transaction OR subject:payment';
    if (lastCheckedTimestamp) {
      // Convert lastCheckedTimestamp to UNIX seconds (UTC)
      const unixSeconds = Math.floor(lastCheckedTimestamp.getTime() / 1000);
      query += ` after:${unixSeconds}`;
    }
    const emails = await fetchEmails(gmailClient, 100, query);

    // No emails found
    if (!emails || emails.length === 0) {
      return NextResponse.json({
        success: true,
        message: lastCheckedTimestamp ? 'No new emails since last check' : 'No HDFC bank emails found to process',
        processedEmails: 0,
        transactions: 0
      });
    }

    // Process each email
    const results = {
      total: emails.length,
      processed: 0,
      transactionsFound: 0,
      transactions: [] as unknown[]
    };

    for (const email of emails) {
      try {
        // Parse the email to extract transaction data
        // The parser already extracts the correct IST time from the email
        const transaction = await parseEmailContent(email);

        if (transaction) {
          // Store the transaction in the user's transaction table
          // The storeTransactionData function will use the parsed time from the email
          const stored = await storeTransactionData(userId, userEmail, transaction);

          if (stored) {
            results.transactionsFound++;
            results.transactions.push({
              emailId: email.id,
              subject: email.subject,
              amount: transaction.amount,
              name: transaction.name,
              date: transaction.date,
              time: transaction.time, // Ensure this is the parsed time from the email
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

    // --- LAST CHECK LOGIC: Update the latest transaction row with 'last checked' ---
    // 1. Find the latest transaction (by date and time)
    const { data: latestRows, error: latestError } = await supabase
      .from(tableName)
      .select('id, date, time')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(1);
    if (latestError) {
      console.error('Error fetching latest transaction:', latestError);
    }
    if (latestRows && latestRows.length > 0) {
      const latestId = latestRows[0].id;
      // 2. Set last_check = 'last checked' for the latest row
      await supabase
        .from(tableName)
        .update({ last_check: 'last checked' })
        .eq('id', latestId);
      // 3. Remove last_check from all other rows
      await supabase
        .from(tableName)
        .update({ last_check: null })
        .neq('id', latestId)
        .eq('last_check', 'last checked');
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
