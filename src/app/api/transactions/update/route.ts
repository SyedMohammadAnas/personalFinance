/**
 * Transaction Update API
 *
 * This API allows updating transaction details in the user's transaction table,
 * such as renaming a transaction's name field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function PATCH(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('Transaction update: Authentication required');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the transaction data from the request body
    const data = await request.json();
    const { transactionId, name } = data;

    if (!transactionId) {
      console.log('Transaction update: Transaction ID is missing');
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      console.log('Transaction update: Name is empty');
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    // Get table name based on user email
    const safeEmail = session.user.email.toLowerCase().replace(/[@.]/g, '_');
    const tableName = `transactions_${safeEmail}`;

    console.log(`Transaction update: Updating transaction ${transactionId} in table ${tableName} with name "${name}"`);

    // Check if transaction exists before updating
    const { data: existingTransaction, error: checkError } = await supabase
      .from(tableName)
      .select('id, name')
      .eq('id', transactionId)
      .single();

    if (checkError) {
      console.error('Transaction update: Error checking if transaction exists:', checkError);
      return NextResponse.json(
        { error: 'Failed to check if transaction exists' },
        { status: 500 }
      );
    }

    if (!existingTransaction) {
      console.log(`Transaction update: Transaction with ID ${transactionId} not found`);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    console.log(`Transaction update: Found transaction, current name: "${existingTransaction.name}"`);

    // Update the transaction name
    const { data: updatedTransaction, error } = await supabase
      .from(tableName)
      .update({ name: name.trim() })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('Transaction update: Error updating transaction:', error);
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      );
    }

    console.log(`Transaction update: Successfully updated name from "${existingTransaction.name}" to "${name.trim()}"`);

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction
    });
  } catch (error) {
    console.error('Error in transaction update route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
