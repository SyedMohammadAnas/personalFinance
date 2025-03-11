/**
 * Transaction Update API
 *
 * This API allows updating transaction details in the user's transaction table,
 * such as renaming a transaction's name field, updating its description, or setting a tag.
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
    const { transactionId, name, description, tag } = data;

    if (!transactionId) {
      console.log('Transaction update: Transaction ID is missing');
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // At least one of name, description, or tag must be provided
    if (
      (!name || name.trim() === '') &&
      description === undefined &&
      tag === undefined
    ) {
      console.log('Transaction update: No valid update fields provided');
      return NextResponse.json(
        { error: 'At least one valid update field is required' },
        { status: 400 }
      );
    }

    // Get table name based on user email
    const safeEmail = session.user.email.toLowerCase().replace(/[@.]/g, '_');
    const tableName = `transactions_${safeEmail}`;

    // Check if transaction exists before updating
    const { data: existingTransaction, error: checkError } = await supabase
      .from(tableName)
      .select('id, name, description, tag')
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

    console.log(
      `Transaction update: Found transaction, current name: "${existingTransaction.name}", ` +
      `description: "${existingTransaction.description || ''}", ` +
      `tag: "${existingTransaction.tag || ''}"`
    );

    // Prepare update object
    const updateData: { name?: string; description?: string; tag?: string } = {};

    // Add fields to update object if they are provided
    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (tag !== undefined) {
      updateData.tag = tag;
    }

    // Update the transaction
    const { data: updatedTransaction, error } = await supabase
      .from(tableName)
      .update(updateData)
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

    // Log what was updated
    if (name !== undefined) {
      console.log(`Transaction update: Updated name from "${existingTransaction.name}" to "${updateData.name}"`);
    }
    if (description !== undefined) {
      console.log(`Transaction update: Updated description from "${existingTransaction.description || ''}" to "${updateData.description}"`);
    }
    if (tag !== undefined) {
      console.log(`Transaction update: Updated tag from "${existingTransaction.tag || ''}" to "${updateData.tag}"`);
    }

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
