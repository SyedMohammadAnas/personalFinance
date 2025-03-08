/**
 * Transaction Parser
 *
 * This utility provides functions to parse bank emails and extract transaction information.
 * It's designed to be extended with specific parsing logic for different banks.
 */

import { EmailData } from './gmail';

/**
 * Parsed transaction data model
 */
export interface TransactionData {
  id: string;            // Unique ID for the transaction (can be email ID)
  amount: number;        // Transaction amount
  name: string;          // Name of sender/recipient or transaction description
  date: Date;            // Transaction date
  time: string;          // Transaction time
  type: TransactionType; // Credit or debit
  bankName: string;      // Source bank name
  category?: string;     // Optional transaction category
  rawEmail: string;      // Raw email ID for reference
  processed: boolean;    // Whether this transaction has been processed
}

/**
 * Transaction type enum
 */
export enum TransactionType {
  CREDIT = 'credit',     // Money received
  DEBIT = 'debit',       // Money sent
  UNKNOWN = 'unknown'    // Can't determine
}

/**
 * Bank detector to identify which bank sent the email
 */
export function detectBankFromEmail(email: EmailData): string {
  const from = email.from.toLowerCase();
  const subject = email.subject.toLowerCase();

  // Indian banks
  if (from.includes('hdfc') || subject.includes('hdfc')) {
    return 'hdfc';
  } else if (from.includes('icici') || subject.includes('icici')) {
    return 'icici';
  } else if (from.includes('sbi') || subject.includes('sbi')) {
    return 'sbi';
  } else if (from.includes('axis') || subject.includes('axis')) {
    return 'axis';
  } else if (from.includes('kotak') || subject.includes('kotak')) {
    return 'kotak';
  } else if (from.includes('pnb') || subject.includes('pnb')) {
    return 'pnb';
  } else if (from.includes('upi') || subject.includes('upi')) {
    return 'upi';
  }

  // US banks (keeping for reference)
  else if (from.includes('chase') || subject.includes('chase')) {
    return 'chase';
  } else if (from.includes('wells fargo') || subject.includes('wells fargo')) {
    return 'wells_fargo';
  } else if (from.includes('bank of america') || subject.includes('bank of america')) {
    return 'bofa';
  } else if (from.includes('citi') || subject.includes('citi')) {
    return 'citi';
  } else if (from.includes('capital one') || subject.includes('capital one')) {
    return 'capital_one';
  }

  // If we can't identify the bank
  return 'generic_indian_bank';
}

/**
 * Main function to parse a bank email and extract transaction data
 */
export async function parseTransactionEmail(email: EmailData): Promise<TransactionData | null> {
  try {
    // First, detect which bank this email is from
    const bankName = detectBankFromEmail(email);

    // Use the generic parser for all banks
    const parsedData = parseGenericIndianBankEmail(email);

    // If we couldn't parse the data, return null
    if (!parsedData) {
      return null;
    }

    // Convert string amount to number
    const amount = parsedData.amount ? parseFloat(parsedData.amount) : 0;

    // Convert date string to Date object
    let dateObj: Date;
    try {
      // Try to parse DD-MMM-YYYY format (e.g., 15-JAN-2023)
      if (parsedData.date) {
        const [day, month, year] = parsedData.date.split('-');
        const monthMap: Record<string, number> = {
          'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
          'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        dateObj = new Date(parseInt(year), monthMap[month.toUpperCase()], parseInt(day));
      } else {
        // Fallback to email date
        dateObj = new Date(email.date);
      }

      // Log the date parsing
      console.log(`Date parsed: ${parsedData.date} -> ${dateObj.toISOString()}`);
    } catch (error) {
      console.error('Error parsing date:', error, 'Original date string:', parsedData.date);
      dateObj = new Date(email.date);
    }

    // Map transactionType to our enum
    let transactionType = TransactionType.UNKNOWN;
    if (parsedData.transactionType.toLowerCase().includes('credit')) {
      transactionType = TransactionType.CREDIT;
    } else if (parsedData.transactionType.toLowerCase().includes('debit')) {
      transactionType = TransactionType.DEBIT;
    }

    // Format the date for SQL (YYYY-MM-DD)
    const formattedDate = dateObj.toISOString().split('T')[0];

    // Complete the transaction data
    return {
      id: email.id,
      amount: amount,
      name: parsedData.name || 'Unknown',
      date: dateObj,
      time: parsedData.time || '00:00:00',
      type: transactionType,
      bankName: bankName,
      category: undefined, // We don't have category information yet
      rawEmail: email.id,
      processed: true
    };
  } catch (error) {
    console.error('Error parsing transaction email:', error);
    return null;
  }
}

/**
 * Generic parser for Indian bank email formats
 * This is the main parser that handles all bank emails
 */
function parseGenericIndianBankEmail(email: EmailData): any {
  const emailContent = email.body || email.rawContent || '';

  console.log('========= PARSING EMAIL CONTENT =========');
  console.log('Email ID:', email.id);
  console.log('From:', email.from);
  console.log('Subject:', email.subject);
  console.log('Date:', email.date);
  console.log('Content preview (first 200 chars):', emailContent.substring(0, 200));

  // If content is empty, return null
  if (!emailContent) {
    console.log('⚠️ Email content is empty - cannot parse');
    return null;
  }

  /**
   * Main parsing function using the provided code
   */
  function parseEmail(emailContent: string) {
    interface ParsedData {
        name: string;
        transactionType: string;
        date: string;
        amount: string;
        emailId: string;
        time: string;
        moneySent: number;
    }

    let parsedData: ParsedData = {
        name: '',
        transactionType: '',
        date: '',
        amount: '',
        emailId: '',
        time: '',
        moneySent: 0
    };

    // Extracting emailId
    const emailMatch = emailContent.match(/to me\s+<([^>]+)>/i);
    if(emailMatch) {
        parsedData.emailId = emailMatch[1];
        console.log('✅ Found email ID:', parsedData.emailId);
    } else {
        console.log('❌ Could not find email ID pattern');
    }

    // Extracting time
    const timeMatch = emailContent.match(/at (\d{1,2}:\d{2}:\d{2})/);
    if(timeMatch) {
        parsedData.time = timeMatch[1];
        console.log('✅ Found time:', parsedData.time);
    } else {
        console.log('❌ Could not find time pattern');
    }

    // Extracting date
    const dateMatch = emailContent.match(/on (\d{2}-[A-Z]{3}-\d{4})/);
    if(dateMatch) {
        parsedData.date = dateMatch[1];
        console.log('✅ Found date:', parsedData.date);
    } else {
        console.log('❌ Could not find date pattern');
    }

    // Extracting amount
    const amountMatch = emailContent.match(/(?:INR|Rs\.|₹)\s*([0-9,]+\.?\d{0,2})/);
    if(amountMatch) {
        parsedData.amount = amountMatch[1].replace(',', '');
        console.log('✅ Found amount:', parsedData.amount);
    } else {
        console.log('❌ Could not find amount pattern');
    }

    // Identifying if money was credited or debited
    if(/\b(credited|received)\b/i.test(emailContent)) {
        parsedData.transactionType = 'Credited';
        parsedData.moneySent = 1;
        console.log('✅ Transaction type: Credit');

        // Extracting sender's name if received via UPI
        const senderMatch = emailContent.match(/by\s+(.*?)\s+on/i);
        if(senderMatch) {
            parsedData.name = senderMatch[1].trim();
            console.log('✅ Found sender name:', parsedData.name);
        } else {
            console.log('❌ Could not find sender name pattern');
        }
    } else if(/\b(debited|paid|withdrawal)\b/i.test(emailContent)) {
        parsedData.transactionType = 'Debited';
        parsedData.moneySent = 0;
        console.log('✅ Transaction type: Debit');

        // Extracting receiver's name if money was sent via UPI
        const receiverMatch = emailContent.match(/to\s+(?:VPA.*?\s+)?([A-Z\s]+)(?=\s+on)/i);
        if(receiverMatch) {
            parsedData.name = receiverMatch[1].trim();
            console.log('✅ Found receiver name:', parsedData.name);
        } else {
            console.log('❌ Could not find receiver name pattern');
        }

        // Handling ATM withdrawals where receiver is always the user
        if(/ATM withdrawal/i.test(emailContent)) {
            parsedData.name = 'You';
            console.log('✅ ATM withdrawal detected, name set to "You"');
        }
    } else {
        console.log('❌ Could not identify transaction type (credit/debit)');
    }

    // Check if we have minimal required data
    const hasMinimalData = !!parsedData.amount && !!parsedData.transactionType;
    if (!hasMinimalData) {
        console.log('⚠️ Missing critical transaction data (amount or type)');
    } else {
        console.log('✅ Minimal transaction data found');
    }

    return parsedData;
  }

  try {
    const parsedData = parseEmail(emailContent);
    console.log('Parsed transaction data result:', parsedData);

    // Return null if no minimal data was found
    if (!parsedData.amount || !parsedData.transactionType) {
      console.log('⚠️ Returning null due to missing critical data');
      return null;
    }

    return parsedData;
  } catch (error) {
    console.error('Error in generic parser:', error);
    return null;
  }
}

/**
 * Placeholder for Chase bank email parsing
 * This should be implemented with specific parsing logic for Chase emails
 */
async function parseChaseEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // We'll use the generic parser for now
  return parseGenericIndianBankEmail(email);
}

/**
 * Placeholder for Wells Fargo bank email parsing
 */
async function parseWellsFargoEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // We'll use the generic parser for now
  return parseGenericIndianBankEmail(email);
}

/**
 * Placeholder for Bank of America email parsing
 */
async function parseBofAEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // We'll use the generic parser for now
  return parseGenericIndianBankEmail(email);
}

/**
 * Placeholder for Citibank email parsing
 */
async function parseCitiEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // We'll use the generic parser for now
  return parseGenericIndianBankEmail(email);
}

/**
 * Placeholder for Capital One email parsing
 */
async function parseCapitalOneEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // We'll use the generic parser for now
  return parseGenericIndianBankEmail(email);
}
