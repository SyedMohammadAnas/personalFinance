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
export function detectBankFromEmail(email: EmailData): string | null {
  const from = email.from.toLowerCase();
  const subject = email.subject.toLowerCase();

  // Basic detection logic - can be expanded with more banks
  if (from.includes('chase') || subject.includes('chase')) {
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

  // No specific bank detected
  return null;
}

/**
 * Main function to parse a bank email and extract transaction data
 */
export async function parseTransactionEmail(email: EmailData): Promise<TransactionData | null> {
  try {
    // First, detect which bank this email is from
    const bankName = detectBankFromEmail(email);

    if (!bankName) {
      console.log('Unknown bank for email:', email.id);
      return null;
    }

    // Based on the bank, use the appropriate parser
    let parsedData: Partial<TransactionData> | null = null;

    switch (bankName) {
      case 'chase':
        parsedData = await parseChaseEmail(email);
        break;
      case 'wells_fargo':
        parsedData = await parseWellsFargoEmail(email);
        break;
      case 'bofa':
        parsedData = await parseBofAEmail(email);
        break;
      case 'citi':
        parsedData = await parseCitiEmail(email);
        break;
      case 'capital_one':
        parsedData = await parseCapitalOneEmail(email);
        break;
      default:
        parsedData = await parseGenericBankEmail(email);
        break;
    }

    // If we couldn't parse the data, return null
    if (!parsedData) {
      return null;
    }

    // Complete the transaction data with common fields
    return {
      id: email.id,
      amount: parsedData.amount || 0,
      name: parsedData.name || 'Unknown',
      date: parsedData.date || new Date(email.date),
      time: parsedData.time || '00:00',
      type: parsedData.type || TransactionType.UNKNOWN,
      bankName: bankName,
      category: parsedData.category,
      rawEmail: email.id,
      processed: true
    };
  } catch (error) {
    console.error('Error parsing transaction email:', error);
    return null;
  }
}

/**
 * Placeholder for Chase bank email parsing
 * This should be implemented with specific parsing logic for Chase emails
 */
async function parseChaseEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // This is a placeholder - actual implementation will come later
  console.log('Parsing Chase email - placeholder');

  // For now, return null to indicate we need custom implementation
  return null;
}

/**
 * Placeholder for Wells Fargo bank email parsing
 */
async function parseWellsFargoEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // This is a placeholder
  console.log('Parsing Wells Fargo email - placeholder');
  return null;
}

/**
 * Placeholder for Bank of America email parsing
 */
async function parseBofAEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // This is a placeholder
  console.log('Parsing Bank of America email - placeholder');
  return null;
}

/**
 * Placeholder for Citibank email parsing
 */
async function parseCitiEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // This is a placeholder
  console.log('Parsing Citibank email - placeholder');
  return null;
}

/**
 * Placeholder for Capital One email parsing
 */
async function parseCapitalOneEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // This is a placeholder
  console.log('Parsing Capital One email - placeholder');
  return null;
}

/**
 * Generic email parser for banks that don't have specific parsing logic
 * Uses regular expressions and common patterns to extract transaction data
 */
async function parseGenericBankEmail(email: EmailData): Promise<Partial<TransactionData> | null> {
  // This is a placeholder for the generic parser
  console.log('Parsing generic bank email - placeholder');

  try {
    const content = email.body || email.rawContent || '';

    // Example of very basic generic parsing:

    // Try to find amount patterns like $123.45
    const amountMatch = content.match(/\$\s?(\d+(?:\.\d{2})?)/);
    let amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    // Try to detect if this is a credit or debit
    let type = TransactionType.UNKNOWN;
    if (content.match(/deposited|received|payment received|credit|added/i)) {
      type = TransactionType.CREDIT;
    } else if (content.match(/withdrawn|sent|charged|debit|payment sent/i)) {
      type = TransactionType.DEBIT;
    }

    // For now, return very basic information
    return {
      amount: amount || 0,
      type: type,
      // Other fields will be filled by the main function
    };
  } catch (error) {
    console.error('Error in generic parser:', error);
    return null;
  }
}
