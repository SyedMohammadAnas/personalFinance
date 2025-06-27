/**
 * Gmail API Integration
 *
 * This module provides functionality to connect to Gmail API and read emails.
 * It uses Google OAuth for authentication and reads emails for the authenticated user.
 *
 * The focus is on reading emails from bank sources for transaction data extraction.
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1 } from 'googleapis';

// Types for email data
export interface EmailData {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  rawContent: string;
}

// Define minimal types for header and part
interface GmailHeader {
  name: string;
  value: string;
}
interface GmailPart {
  mimeType: string;
  body?: { data?: string };
}

/**
 * Creates a Gmail API client using OAuth2 credentials
 * Adds logging for the token used.
 */
export async function createGmailClient(accessToken: string): Promise<gmail_v1.Gmail> {
  // Mask the token for logs
  const maskedToken = accessToken ? accessToken.slice(0, 6) + '...' + accessToken.slice(-4) : 'NO TOKEN';
  console.log(`[GMAIL] Using access token: ${maskedToken}`);

  // Create OAuth2 client
  const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Set credentials
  oAuth2Client.setCredentials({
    access_token: accessToken
  });

  // Create Gmail client
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

/**
 * Retrieves a list of emails from the user's Gmail account
 * Focuses specifically on bank emails
 * Adds detailed logging of the API request and response.
 */
export async function fetchEmails(
  gmailClient: gmail_v1.Gmail,
  maxResults: number = 100,
  query: string = 'from:hdfc OR from:hdfcbank OR subject:hdfc OR subject:transaction OR subject:payment'
): Promise<EmailData[]> {
  try {
    console.log(`[GMAIL] Fetching emails with query: ${query}, max results: ${maxResults}`);
    // Log the actual API request
    console.log(`[GMAIL] Making API request: users.messages.list, userId: 'me', maxResults: ${maxResults}`);
    // List messages matching the query
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: query
    });
    // Log the raw response (limit output for large responses)
    if (response && response.data) {
      console.log(`[GMAIL] API response:`, {
        resultSizeEstimate: response.data.resultSizeEstimate,
        messages: response.data.messages ? response.data.messages.slice(0, 3) : [],
      });
    } else {
      console.log('[GMAIL] No data in API response');
    }
    const messages = response.data.messages || [];
    console.log(`[GMAIL] Found ${messages.length} email(s) matching the query`);
    const emails: EmailData[] = [];
    // Fetch full details for each message
    for (const message of messages) {
      try {
        if (!message.id) continue; // Skip if id is null or undefined
        const emailData = await getEmailDetails(gmailClient, message.id);
        if (emailData) {
          // Check if this is a bank email - more specific filtering
          if (isHdfcBankEmail(emailData)) {
            emails.push(emailData);
            console.log(`[GMAIL] Added email with subject: "${emailData.subject}" from ${emailData.from}`);
          } else {
            console.log(`[GMAIL] Skipped non-bank email: "${emailData.subject}"`);
          }
        }
      } catch (error) {
        console.error(`[GMAIL] Error fetching email ${message.id}:`, error);
        if (isErrorWithResponseData(error)) {
          console.error('[GMAIL] API error response data:', error.response.data);
        }
      }
    }
    console.log(`[GMAIL] Successfully processed ${emails.length} HDFC bank email(s)`);
    return emails;
  } catch (error: unknown) {
    console.error('[GMAIL] Error fetching emails:', error);
    if (isErrorWithResponseData(error)) {
      console.error('[GMAIL] API error response data:', error.response.data);
    }
    return [];
  }
}

/**
 * Checks if an email is a transaction-related bank email
 */
function isHdfcBankEmail(email: EmailData): boolean {
  const from = email.from.toLowerCase();
  const subject = email.subject.toLowerCase();
  const content = email.rawContent.toLowerCase();

  // Skip non-transaction and balance emails
  if (
    subject.includes('otp') ||
    subject.includes('password') ||
    subject.includes('welcome') ||
    subject.includes('verify') ||
    subject.includes('authentication') ||
    subject.includes('security') ||
    subject.includes('html') ||
    subject.includes('balance') ||
    subject.includes('statement') ||
    content.includes('this is an auto generated mail') ||
    content.includes('view this message in html') ||
    content.includes('available balance') ||
    content.includes('bank statement')
  ) {
    console.log(`Skipping non-transaction email: ${subject}`);
    return false;
  }

  // Check if email is from HDFC Bank
  if (from.includes('hdfc') || from.includes('hdfcbank') || from.includes('alerts@hdfcbank.net')) {
    // Specifically check for credited transaction indicators
    if (
      content.includes('credited to your account') ||
      content.includes('credited to') ||
      content.includes('has been credited') ||
      content.includes('successfully credited') ||
      subject.includes('credited') ||
      subject.includes('credit')
    ) {
      console.log(`Found credited transaction email: ${subject}`);
      return true;
    }

    // Check for general transaction keywords
    return content.includes('credited') ||
           content.includes('debited') ||
           content.includes('transaction') ||
           content.includes('payment') ||
           content.includes('upi') ||
           content.includes('account') ||
           subject.includes('transaction') ||
           subject.includes('payment') ||
           subject.includes('upi');
  }

  // Check if subject contains transaction-related terms
  if (
    subject.includes('transaction') ||
    subject.includes('payment') ||
    subject.includes('credited') ||
    subject.includes('debited') ||
    subject.includes('upi txn') ||
    subject.includes('credit')
  ) {
    return true;
  }

  // Check content for transaction-specific phrases
  if (
    content.includes('rs.') ||
    content.includes('credited to your account') ||
    content.includes('debited from your account') ||
    content.includes('transaction reference') ||
    content.includes('upi transaction') ||
    content.includes('successfully credited')
  ) {
    return true;
  }

  return false;
}

/**
 * Gets detailed information about a specific email
 */
async function getEmailDetails(gmailClient: gmail_v1.Gmail, messageId: string): Promise<EmailData | null> {
  try {
    // Get the full message details
    const message = await gmailClient.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = (message.data.payload && message.data.payload.headers ? message.data.payload.headers : []) as GmailHeader[];

    // Extract header information
    const getHeader = (name: string) => {
      const header = headers.find((h: GmailHeader) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Extract body content
    let body = '';
    let rawContent = '';

    // Handle different payload structures
    if (message.data.payload && message.data.payload.parts && message.data.payload.parts.length > 0) {
      // Get the plain text part if available
      const textPart = (message.data.payload.parts as GmailPart[]).find(
        (part: GmailPart) => part.mimeType === 'text/plain'
      );

      if (textPart && textPart.body && textPart.body.data) {
        const buff = Buffer.from(textPart.body.data, 'base64');
        body = buff.toString('utf-8');
      } else if (message.data.payload.parts[0].body && message.data.payload.parts[0].body.data) {
        const buff = Buffer.from(message.data.payload.parts[0].body.data, 'base64');
        body = buff.toString('utf-8');
      }

      // Store the raw content for later parsing
      rawContent = body;
    } else if (message.data.payload && message.data.payload.body && message.data.payload.body.data) {
      const buff = Buffer.from(message.data.payload.body.data, 'base64');
      body = buff.toString('utf-8');
      rawContent = body;
    }

    return {
      id: messageId,
      threadId: message.data.threadId ?? '',
      from: getHeader('from') ?? '',
      to: getHeader('to') ?? '',
      subject: getHeader('subject') ?? '',
      date: getHeader('date') ?? '',
      body: body ?? '',
      rawContent: rawContent ?? ''
    };
  } catch (error) {
    console.error(`Error getting email details for ${messageId}:`, error);
    return null;
  }
}

// Type guard for error with response.data
function isErrorWithResponseData(error: unknown): error is { response: { data: unknown } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: unknown } }).response !== null &&
    'data' in (error as { response: { data?: unknown } }).response
  );
}
