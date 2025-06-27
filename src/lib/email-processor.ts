/**
 * Email Processor Utility
 *
 * This module handles storing raw email data in user-specific Supabase tables.
 * Each user email has its own table for storing their bank transaction emails.
 * The actual parsing of email content will be implemented separately.
 */

import { createClient } from '@supabase/supabase-js';
import { EmailData } from './gmail';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Ensures that a table exists for the specified user email
 * Each user gets their own table for email data storage
 */
export async function ensureUserEmailTable(userEmail: string): Promise<boolean> {
  try {
    console.log('[EMAIL PROCESSOR] Ensuring user email table for:', userEmail);
    // Sanitize email to create a valid table name
    const tableName = getTableNameFromEmail(userEmail);

    // Create a new Supabase client for admin operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if the table already exists
    const { data, error } = await supabase
      .from('_tables')
      .select('*')
      .eq('name', tableName)
      .limit(1);

    if (error) {
      console.error(`[EMAIL PROCESSOR] Error checking if table ${tableName} exists:`, error);
    }

    // If table doesn't exist, create it
    if (!data || data.length === 0) {
      // Use the REST API to create a table (since Supabase JS client doesn't support this directly)
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          command: `
            CREATE TABLE IF NOT EXISTS "${tableName}" (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              email_id TEXT NOT NULL,
              thread_id TEXT,
              from_address TEXT,
              to_address TEXT,
              subject TEXT,
              date TIMESTAMP,
              raw_content TEXT,
              processed BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        })
      });

      if (!res.ok) {
        console.error(`[EMAIL PROCESSOR] Failed to create table ${tableName}:`, await res.text());
        return false;
      }

      console.log(`[EMAIL PROCESSOR] Created table ${tableName} for user ${userEmail}`);
    }

    return true;
  } catch (error) {
    console.error(`[EMAIL PROCESSOR] Error ensuring user email table for ${userEmail}:`, error);
    return false;
  }
}

/**
 * Stores email data in the user's specific table
 */
export async function storeEmailData(userEmail: string, emails: EmailData[]): Promise<boolean> {
  try {
    console.log('[EMAIL PROCESSOR] Storing emails for user:', userEmail, 'Number of emails:', emails.length);
    // Ensure the user's table exists
    const tableExists = await ensureUserEmailTable(userEmail);
    if (!tableExists) {
      console.error(`Failed to ensure table exists for ${userEmail}`);
      return false;
    }

    // Get the table name
    const tableName = getTableNameFromEmail(userEmail);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Process each email
    for (const email of emails) {
      console.log('[EMAIL PROCESSOR] Processing email:', {
        id: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date
      });
      // Check if this email already exists in the table
      const { data: existingEmail } = await supabase
        .from(tableName)
        .select('id')
        .eq('email_id', email.id)
        .limit(1);

      if (existingEmail && existingEmail.length > 0) {
        console.log(`[EMAIL PROCESSOR] Email ${email.id} already exists for user ${userEmail}`);
        continue; // Skip this email
      }

      // Insert the email into the table
      const { error } = await supabase
        .from(tableName)
        .insert({
          email_id: email.id,
          thread_id: email.threadId,
          from_address: email.from,
          to_address: email.to,
          subject: email.subject,
          date: new Date(email.date),
          raw_content: email.rawContent,
          processed: false
        });

      if (error) {
        console.error(`[EMAIL PROCESSOR] Error storing email ${email.id} for user ${userEmail}:`, error);
      } else {
        console.log(`[EMAIL PROCESSOR] Stored email ${email.id} for user ${userEmail}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`[EMAIL PROCESSOR] Error storing emails for ${userEmail}:`, error);
    return false;
  }
}

/**
 * Converts an email address to a valid table name
 */
export function getTableNameFromEmail(email: string): string {
  // Remove special characters and replace @ and . with underscores
  return `email_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}
