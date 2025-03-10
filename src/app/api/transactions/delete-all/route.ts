/**
 * Delete All Transactions API
 *
 * This API endpoint handles deleting all transactions from a user's transaction table
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// For deletion operations it's better to use the service role key if available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function DELETE(request: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('Delete all transactions: Authentication required');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email.toLowerCase();
    console.log(`Deleting all transactions for user: ${userEmail}`);

    // Get table name based on user email
    const safeEmail = userEmail.replace(/[@.]/g, '_');
    const tableName = `transactions_${safeEmail}`;

    // First check how many transactions we have
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`Error getting transaction count: ${countError.message}`);
      return NextResponse.json(
        { error: 'Failed to access transactions table' },
        { status: 500 }
      );
    }

    console.log(`Found ${count} transactions to delete`);

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transactions found to delete'
      });
    }

    // Since we can't easily delete all rows at once due to RLS policies,
    // we'll fetch all IDs and delete them in batches
    const { data: idsData, error: idsError } = await supabase
      .from(tableName)
      .select('id');

    if (idsError) {
      console.error('Error fetching transaction IDs:', idsError);
      return NextResponse.json(
        { error: 'Failed to retrieve transaction IDs for deletion' },
        { status: 500 }
      );
    }

    const ids = idsData.map(row => row.id);
    console.log(`Retrieved ${ids.length} transaction IDs for deletion`);

    // Delete transactions by ID in batches
    const BATCH_SIZE = 100;
    let deletedCount = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batchIds = ids.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', batchIds);

      if (deleteError) {
        console.error(`Error deleting batch ${i/BATCH_SIZE + 1}:`, deleteError);
        return NextResponse.json(
          { error: 'Failed while deleting transactions', partiallyDeleted: deletedCount },
          { status: 500 }
        );
      }

      deletedCount += batchIds.length;
      console.log(`Deleted batch ${i/BATCH_SIZE + 1}, progress: ${deletedCount}/${ids.length}`);
    }

    console.log(`Successfully deleted all ${deletedCount} transactions for ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: `All ${deletedCount} transactions successfully deleted`
    });
  } catch (error) {
    console.error('Error in delete all transactions route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
