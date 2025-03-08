/**
 * Email Processor Utility
 *
 * This module handles storing raw email data in user-specific Supabase tables.
 * Each user email has its own table for storing their bank transaction emails.
 * The actual parsing of email content will be implemented separately.
 */

import { createClient } from '@supabase/supabase-js';
import { EmailData } from './gmail';
import { parseTransactionEmail, TransactionData } from './transaction-parser';
import { sanitizeEmailForTableName } from './utils';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Ensures that a table exists for the specified user email
 * Each user gets their own table for email data storage
 */
export async function ensureUserEmailTable(userEmail: string): Promise<boolean> {
  try {
    // Sanitize email to create a valid table name
    const tableName = getTableNameFromEmail(userEmail);
    console.log(`Ensuring email table exists: ${tableName}`);

    // Create a new Supabase client for admin operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Instead of checking metadata table, try to query the table directly
    try {
      // Just try to get a single row from the table
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      // If no error, table exists
      if (!error) {
        console.log(`Table ${tableName} already exists`);

        // Make sure transactions table also exists
        await ensureUserTransactionsTable(userEmail);
        return true;
      }

      // If error is not "relation does not exist", it's a different problem
      if (!error.message.includes('does not exist')) {
        console.error(`Error querying table ${tableName}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
    }

    // If we get here, table doesn't exist or couldn't be checked
    console.log(`Creating table ${tableName} for user ${userEmail}`);

    // Use the Supabase SQL function instead of REST API
    try {
      const { error } = await supabase.rpc('create_user_email_table', {
        user_email: userEmail,
        table_name: tableName
      });

      if (error) {
        console.error(`Error executing create_user_email_table:`, error);

        // Try direct query as fallback
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_string: `
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
        });

        if (sqlError) {
          console.error(`Fallback SQL execution failed:`, sqlError);
          return false;
        }
      }

      console.log(`Table ${tableName} created successfully`);

      // Make sure transactions table also exists
      await ensureUserTransactionsTable(userEmail);
      return true;
    } catch (error) {
      console.error(`Error creating table ${tableName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Error ensuring user email table for ${userEmail}:`, error);
    return false;
  }
}

/**
 * Ensures that a transactions table exists for the specified user
 * This table will store the parsed transaction data from bank emails
 */
export async function ensureUserTransactionsTable(userEmail: string): Promise<boolean> {
  try {
    // Sanitize email to create a valid table name
    const tableName = getTransactionsTableNameFromEmail(userEmail);
    console.log(`Ensuring transactions table exists: ${tableName}`);

    // Create a new Supabase client for admin operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try to query the table directly
    try {
      // Just try to get a single row from the table
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      // If no error, table exists
      if (!error) {
        console.log(`Table ${tableName} already exists`);
        return true;
      }

      // If error is not "relation does not exist", it's a different problem
      if (!error.message.includes('does not exist')) {
        console.error(`Error querying table ${tableName}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
    }

    // If we get here, table doesn't exist or couldn't be checked
    console.log(`Creating table ${tableName} for user ${userEmail}`);

    // Use the Supabase SQL function instead of REST API
    try {
      const { error } = await supabase.rpc('create_user_transactions_table', {
        user_email: userEmail,
        table_name: tableName
      });

      if (error) {
        console.error(`Error executing create_user_transactions_table:`, error);

        // Try direct query as fallback
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_string: `
            CREATE TABLE IF NOT EXISTS "${tableName}" (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              email_id TEXT NOT NULL UNIQUE,
              amount NUMERIC,
              name TEXT,
              transaction_date DATE,
              transaction_time TEXT,
              transaction_type TEXT,
              bank_name TEXT,
              category TEXT,
              raw_email TEXT,
              processed BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });

        if (sqlError) {
          console.error(`Fallback SQL execution failed:`, sqlError);
          return false;
        }
      }

      console.log(`Table ${tableName} created successfully`);
      return true;
    } catch (error) {
      console.error(`Error creating table ${tableName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Error ensuring user transactions table for ${userEmail}:`, error);
    return false;
  }
}

/**
 * Stores email data in the user's specific table
 */
export async function storeEmailData(userEmail: string, emails: EmailData[]): Promise<boolean> {
  try {
    console.log(`Attempting to store ${emails.length} emails for user ${userEmail}`);

    // Ensure the user's table exists
    const tableExists = await ensureUserEmailTable(userEmail);
    if (!tableExists) {
      console.error(`Failed to ensure table exists for ${userEmail}`);
      return false;
    }

    // Get the table name
    const tableName = getTableNameFromEmail(userEmail);
    console.log(`Using email table: ${tableName}`);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    let storedCount = 0;

    // Process each email
    for (const email of emails) {
      try {
        console.log(`Processing email ${email.id}`);

        // Check if this email already exists in the table using a more reliable approach
        try {
          const { data: existingData, error: checkError } = await supabase
            .from(tableName)
            .select('id')
            .eq('email_id', email.id)
            .limit(1);

          if (checkError) {
            console.error(`Error checking if email ${email.id} exists:`, checkError);
            continue;
          }

          if (existingData && existingData.length > 0) {
            console.log(`Email ${email.id} already exists for user ${userEmail}`);
            continue; // Skip this email
          }
        } catch (queryError) {
          console.error(`Exception checking if email ${email.id} exists:`, queryError);
          continue;
        }

        // Insert the email into the table
        const emailData = {
          email_id: email.id,
          thread_id: email.threadId,
          from_address: email.from,
          to_address: email.to,
          subject: email.subject,
          date: new Date(email.date),
          raw_content: email.rawContent,
          processed: false
        };

        console.log(`Inserting email ${email.id} data:`, {
          email_id: email.id,
          from: email.from,
          subject: email.subject,
          date: new Date(email.date)
        });

        const { error: insertError } = await supabase
          .from(tableName)
          .insert(emailData);

        if (insertError) {
          console.error(`Error storing email ${email.id} for user ${userEmail}:`, insertError);
        } else {
          console.log(`Stored email ${email.id} for user ${userEmail}`);
          storedCount++;

          // Now try to parse the email for transaction data
          await parseAndStoreTransaction(userEmail, email);
        }
      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);
      }
    }

    console.log(`Successfully stored ${storedCount} out of ${emails.length} emails for ${userEmail}`);
    return true;
  } catch (error) {
    console.error(`Error storing emails for ${userEmail}:`, error);
    return false;
  }
}

/**
 * Parse an email for transaction data and store it in the user's transactions table
 */
export async function parseAndStoreTransaction(userEmail: string, email: EmailData): Promise<boolean> {
  try {
    console.log(`Parsing email ${email.id} for transaction data`);

    // Ensure the transactions table exists
    const tableExists = await ensureUserTransactionsTable(userEmail);
    if (!tableExists) {
      console.error(`Failed to ensure transactions table exists for ${userEmail}`);
      return false;
    }

    // Try to parse the email
    let transactionData;
    try {
      transactionData = await parseTransactionEmail(email);
      if (!transactionData) {
        console.log(`No transaction data found in email ${email.id}`);
        return false;
      }
    } catch (parseError) {
      console.error(`Error parsing email ${email.id}:`, parseError);
      return false;
    }

    // Get the transactions table name
    const tableName = getTransactionsTableNameFromEmail(userEmail);
    console.log(`Storing transaction in table: ${tableName}`);

    // Format the date for SQL (YYYY-MM-DD)
    const formattedDate = transactionData.date.toISOString().split('T')[0];

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if this transaction already exists
    try {
      const { data: existingData, error: checkError } = await supabase
        .from(tableName)
        .select('id')
        .eq('email_id', email.id)
        .limit(1);

      if (checkError) {
        // If the error is about the table not existing, it's not a problem
        // because we just tried to create it
        if (!checkError.message.includes('does not exist')) {
          console.error(`Error checking for existing transaction:`, checkError);
          return false;
        }
      } else if (existingData && existingData.length > 0) {
        console.log(`Transaction for email ${email.id} already exists`);
        return true;
      }
    } catch (checkError) {
      console.error(`Exception checking for existing transaction:`, checkError);
    }

    // Insert the transaction data
    try {
      const transactionRecord = {
        email_id: email.id,
        amount: transactionData.amount,
        name: transactionData.name,
        date: formattedDate,
        time: transactionData.time,
        type: transactionData.type,
        bank_name: transactionData.bankName,
        category: null,
        raw_email: email.id,
        processed: true
      };

      console.log(`Inserting transaction data:`, {
        email_id: email.id,
        amount: transactionData.amount,
        name: transactionData.name,
        date: formattedDate
      });

      const { error } = await supabase
        .from(tableName)
        .insert(transactionRecord);

      if (error) {
        console.error(`Error storing transaction data for email ${email.id}:`, error);
        return false;
      }

      console.log(`Successfully stored transaction data for email ${email.id}`);

      // Update the email record to mark it as processed
      try {
        const emailTableName = getTableNameFromEmail(userEmail);
        const { error: updateError } = await supabase
          .from(emailTableName)
          .update({ processed: true })
          .eq('email_id', email.id);

        if (updateError) {
          console.error(`Error updating email processed status:`, updateError);
        }
      } catch (updateError) {
        console.error(`Exception updating email processed status:`, updateError);
      }

      return true;
    } catch (insertError) {
      console.error(`Exception storing transaction:`, insertError);
      return false;
    }
  } catch (error) {
    console.error(`Error parsing and storing transaction for ${userEmail}:`, error);
    return false;
  }
}

/**
 * Converts an email address to a valid table name
 */
export function getTableNameFromEmail(email: string): string {
  // Use the utility function for consistent naming
  return `email_${sanitizeEmailForTableName(email)}`;
}

/**
 * Converts an email address to a valid transactions table name
 */
export function getTransactionsTableNameFromEmail(email: string): string {
  // Use the utility function for consistent naming
  return `transactions_${sanitizeEmailForTableName(email)}`;
}
