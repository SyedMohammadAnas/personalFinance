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

/**
 * Creates a Gmail API client using OAuth2 credentials
 */
export async function createGmailClient(accessToken: string): Promise<any> {
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
 * Focuses specifically on bank emails by default
 */
export async function fetchEmails(
  gmailClient: any,
  maxResults: number = 10,
  query: string = 'from:bank OR from:statement OR subject:transaction OR subject:statement'
): Promise<EmailData[]> {
  try {
    // List messages matching the query
    const response = await gmailClient.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: query
    });

    const messages = response.data.messages || [];
    const emails: EmailData[] = [];

    // Fetch full details for each message
    for (const message of messages) {
      try {
        const emailData = await getEmailDetails(gmailClient, message.id);
        if (emailData) {
          emails.push(emailData);
        }
      } catch (error) {
        console.error(`Error fetching email ${message.id}:`, error);
      }
    }

    return emails;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

/**
 * Gets detailed information about a specific email
 */
async function getEmailDetails(gmailClient: any, messageId: string): Promise<EmailData | null> {
  try {
    // Get the full message details
    const message = await gmailClient.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = message.data.payload.headers;

    // Extract header information
    const getHeader = (name: string) => {
      const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Extract body content
    let body = '';
    let rawContent = '';

    // Handle different payload structures
    if (message.data.payload.parts && message.data.payload.parts.length > 0) {
      // Get the plain text part if available
      const textPart = message.data.payload.parts.find(
        (part: any) => part.mimeType === 'text/plain'
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
    } else if (message.data.payload.body && message.data.payload.body.data) {
      const buff = Buffer.from(message.data.payload.body.data, 'base64');
      body = buff.toString('utf-8');
      rawContent = body;
    }

    return {
      id: messageId,
      threadId: message.data.threadId,
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      body: body,
      rawContent: rawContent
    };
  } catch (error) {
    console.error(`Error getting email details for ${messageId}:`, error);
    return null;
  }
}
