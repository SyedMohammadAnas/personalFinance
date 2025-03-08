/**
 * Transactions List Component
 *
 * This component displays a user's transaction data in a table format.
 * It fetches transaction data from the API and updates automatically.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Transaction {
  id: string;
  email_id: string;
  amount: number;
  name: string;
  transaction_date: string;
  transaction_time: string;
  transaction_type: 'credit' | 'debit' | 'unknown';
  bank_name: string;
  category?: string;
  created_at: string;
}

interface PaginationData {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function TransactionsList() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0, limit: 10, offset: 0, hasMore: false
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noDataYet, setNoDataYet] = useState(false);

  // Function to fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoDataYet(false);

      // Make sure we have a session
      if (!session || !session.user) {
        setError('You must be logged in to view transactions.');
        setLoading(false);
        return;
      }

      // Build the query URL
      const url = new URL('/api/transactions/user', window.location.origin);
      url.searchParams.append('limit', pagination.limit.toString());
      url.searchParams.append('offset', pagination.offset.toString());

      console.log('Fetching transactions from:', url.toString());

      // Fetch the transactions
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Check for non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      console.log('Transactions data received:', data);

      // Check if we have an error in the response even with status 200
      if (data.error) {
        if (data.error === 'Transaction table not found') {
          setNoDataYet(true);
        } else {
          setError(data.error);
        }
        setTransactions([]);
        setPagination({
          total: 0,
          limit: pagination.limit,
          offset: 0,
          hasMore: false
        });
      } else {
        // Set the transactions and pagination data
        setTransactions(data.transactions || []);
        setPagination(data.pagination || {
          total: 0,
          limit: pagination.limit,
          offset: pagination.offset,
          hasMore: false
        });

        // Show "no data yet" message if we get an empty array
        if (data.transactions && data.transactions.length === 0) {
          setNoDataYet(true);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh transactions
  const refreshTransactions = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Make sure we have a session
      if (!session || !session.user) {
        setError('You must be logged in to refresh transactions.');
        setRefreshing(false);
        return;
      }

      console.log('Processing emails before fetching transactions');

      // Call the API to process emails
      const response = await fetch('/api/transactions/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error processing emails:', errorData);
        throw new Error(errorData.error || 'Failed to refresh transactions');
      }

      const result = await response.json();
      console.log('Email processing result:', result);

      // Show success message temporarily
      setError('Emails processed successfully. Fetching transactions...');
      setTimeout(() => setError(null), 3000);

      // Fetch the transactions again
      await fetchTransactions();
    } catch (error) {
      console.error('Error refreshing transactions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  // Load transactions when the component mounts
  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, pagination.offset, pagination.limit]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination({
        ...pagination,
        offset: pagination.offset + pagination.limit
      });
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination({
        ...pagination,
        offset: Math.max(0, pagination.offset - pagination.limit)
      });
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Recent Transactions</span>
            <Button
              onClick={refreshTransactions}
              disabled={refreshing}
              size="sm"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardTitle>
          <CardDescription>
            Your recent financial transactions from bank emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className={`p-4 rounded-md mb-4 ${error.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          {!loading && noDataYet && !error && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="font-medium text-lg">No transactions yet</p>
              <p className="text-sm mt-2">
                It looks like we haven't processed any bank emails yet.
              </p>
              <p className="text-sm mt-1">
                Click "Refresh" to begin processing emails for transaction data.
              </p>
            </div>
          )}

          {!loading && transactions.length === 0 && !noDataYet && !error && (
            <div className="text-center py-6 text-muted-foreground">
              <p>No transactions found.</p>
              <p className="text-sm mt-2">Try refreshing to check for new emails.</p>
            </div>
          )}

          {!loading && transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left">Date</th>
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-left">Type</th>
                    <th className="py-2 px-3 text-left">Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-3">
                        {formatDate(transaction.transaction_date)}
                        <div className="text-xs text-muted-foreground">
                          {transaction.transaction_time}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {transaction.name}
                        {transaction.category && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.category}
                          </div>
                        )}
                      </td>
                      <td className={`py-3 px-3 text-right ${
                        transaction.transaction_type === 'credit'
                          ? 'text-green-600'
                          : transaction.transaction_type === 'debit'
                            ? 'text-red-600'
                            : ''
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          transaction.transaction_type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : transaction.transaction_type === 'debit'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.transaction_type === 'credit'
                            ? 'Credit'
                            : transaction.transaction_type === 'debit'
                              ? 'Debit'
                              : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {transaction.bank_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        {!loading && transactions.length > 0 && (
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {pagination.offset + 1}-
              {Math.min(pagination.offset + transactions.length, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
