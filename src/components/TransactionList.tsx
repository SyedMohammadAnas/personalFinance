/**
 * Transaction List Component
 *
 * This component displays a list of transactions from the user's transaction table
 * and provides a refresh button to process new emails.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RefreshCcw, ArrowUpRight, ArrowDownLeft, CalendarDays, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import TransactionDetailsModal from './TransactionDetailsModal';
import { AddTransactionButton } from './AddTransactionModal';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Transaction type
interface Transaction {
  id: string;
  email_id: string;
  amount: number;
  name: string;
  date: string;
  time: string;
  transaction_type: string;
  created_at: string;
}

interface TransactionListProps {
  onTransactionsUpdated?: () => void;
}

export default function TransactionList({ onTransactionsUpdated }: TransactionListProps) {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(4); // Show only 4 items initially
  const [dayFilter, setDayFilter] = useState('7'); // Default to showing 7 days

  // State for transaction details modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to open transaction details modal
  const openTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  // Function to close transaction details modal
  const closeTransactionDetails = () => {
    setIsModalOpen(false);
    // Clear selected transaction after a delay to allow the modal to close smoothly
    setTimeout(() => {
      setSelectedTransaction(null);
    }, 300);
  };

  // Function to fetch transactions from the user's table
  const fetchTransactions = async () => {
    try {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Get table name based on user email
      const safeEmail = session.user.email.toLowerCase().replace(/[@.]/g, '_');
      const tableName = `transactions_${safeEmail}`;

      // Fetch transactions with proper sorting - newest first
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        setError('Failed to load transactions. Please try again later.');
      } else {
        setTransactions(data || []);
        filterTransactionsByDays(data || [], dayFilter);
      }
    } catch (err) {
      console.error('Error in fetchTransactions:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to get a user-friendly period text
  const getPeriodText = (days: string) => {
    if (days === 'all') return 'all time';
    if (days === '30') return '1 month';
    return `${days} days`;
  };

  // Function to filter transactions based on selected day range
  const filterTransactionsByDays = (transactionsData: Transaction[], days: string) => {
    if (days === 'all') {
      setFilteredTransactions(transactionsData);
      return;
    }

    const daysNum = parseInt(days);
    const today = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(today.getDate() - daysNum);

    const filtered = transactionsData.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= cutoffDate;
    });

    setFilteredTransactions(filtered);
  };

  // Handle day filter change
  const handleDayFilterChange = (value: string) => {
    setDayFilter(value);
    filterTransactionsByDays(transactions, value);
  };

  // Function to process new emails and update transactions
  const refreshTransactions = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Call the process API
      const response = await fetch('/api/transactions/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process emails');
      }

      // Fetch updated transactions
      await fetchTransactions();

      // Notify parent component if callback provided - this updates latest transaction cards
      if (onTransactionsUpdated) {
        // Call the callback function to update latest transaction cards in dashboard
        onTransactionsUpdated();
        console.log('Notified dashboard to update latest transaction cards');
      }

      return result;
    } catch (err) {
      console.error('Error refreshing transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh transactions');
      return null;
    } finally {
      setRefreshing(false);
    }
  };

  // Handle transaction update from modal
  const handleTransactionUpdated = async () => {
    console.log('TransactionList: Transaction was updated, refreshing data...');

    try {
      // Fetch updated transactions
      await fetchTransactions();

      // Notify parent component if callback provided
      if (onTransactionsUpdated) {
        console.log('TransactionList: Notifying dashboard to update latest transaction cards');
        onTransactionsUpdated();
      }
    } catch (err) {
      console.error('Error refreshing transactions after update:', err);
      setError('Failed to refresh transactions after update. Please try again.');
    }
  };

  // Fetch transactions on component mount
  useEffect(() => {
    const loadTransactions = async () => {
      if (session?.user?.email) {
        await fetchTransactions();
        // Notify parent component to update latest transaction cards
        if (onTransactionsUpdated) {
          onTransactionsUpdated();
          console.log('Initial load: Notified dashboard to update latest transaction cards');
        }
      }
    };

    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only on mount

  // Format currency
  const formatCurrency = (amount: number) => {
    // Use INR for Indian transactions
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Add a helper to format time as HH:MM AM/PM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    // Parse timeStr as HH:MM:SS
    const [hourStr, minuteStr, secondStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  if (!session) {
    return (
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Please sign in to view your transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-gray-800 bg-[#111827]/60 shadow-md text-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl text-white">Recent Transactions</CardTitle>
          <div className="flex items-center gap-2">
            <AddTransactionButton onTransactionAdded={refreshTransactions} />
            <div className="flex items-center bg-gray-800 rounded-md">
              <Select value={dayFilter} onValueChange={handleDayFilterChange}>
                <SelectTrigger className="h-8 min-w-[120px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                  <CalendarDays className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Filter by days" />
                </SelectTrigger>
                <SelectContent align="center" className="min-w-[150px]">
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="10">10 days</SelectItem>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={refreshTransactions}
              disabled={refreshing}
              size="sm"
              className="h-8 gap-1 bg-gray-800 hover:bg-gray-700 text-white"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Processing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCcw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="py-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => fetchTransactions()}
              >
                Try Again
              </Button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No transactions found{dayFilter !== 'all' ? ` in the last ${getPeriodText(dayFilter)}` : ''}.</p>
              <p className="text-xs text-gray-500 mt-1">
                {dayFilter !== 'all' ? 'Try selecting a different time period or ' : ''}Click refresh to process new emails.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show the first 4 transactions without scrolling */}
              {displayCount <= 4 ? (
                <>
                  {filteredTransactions.slice(0, displayCount).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center border-b border-gray-800 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-800/30 rounded-md p-2 transition-colors"
                      onClick={() => openTransactionDetails(transaction)}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                        {transaction.transaction_type === 'credited' ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                      <div className="ml-3 flex-1 flex items-center justify-between">
                        <div className="flex flex-col flex-1">
                          <span className="text-base">{transaction.name}</span>
                          <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <span>{formatDate(transaction.date)}</span>
                            {transaction.time && (
                              <>
                                <span className="mx-1">•</span>
                                <Clock className="inline h-3 w-3 text-gray-500" />
                                <span>{formatTime(transaction.time)}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <div className={`flex flex-row ml-auto ${transaction.transaction_type === 'credited' ? 'text-green-400' : 'text-red-400'} text-base font-semibold`}>
                          {transaction.transaction_type === 'credited' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* View More button - consistently positioned below transactions */}
                  {filteredTransactions.length > displayCount && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                      onClick={() => setDisplayCount(filteredTransactions.length)}
                    >
                      View More
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* Scrollable transaction list */}
                  <div className="max-h-80 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-700">
                    {filteredTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center border-b border-gray-800 pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-800/30 rounded-md p-2 transition-colors"
                        onClick={() => openTransactionDetails(transaction)}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                          {transaction.transaction_type === 'credited' ? (
                            <ArrowDownLeft className="h-5 w-5 text-green-400" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div className="ml-3 flex-1 flex items-center justify-between">
                          <div className="flex flex-col flex-1">
                            <span className="text-base">{transaction.name}</span>
                            <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <span>{formatDate(transaction.date)}</span>
                              {transaction.time && (
                                <>
                                  <span className="mx-1">•</span>
                                  <Clock className="inline h-3 w-3 text-gray-500" />
                                  <span>{formatTime(transaction.time)}</span>
                                </>
                              )}
                            </span>
                          </div>
                          <div className={`flex flex-row ml-auto ${transaction.transaction_type === 'credited' ? 'text-green-400' : 'text-red-400'} text-base font-semibold`}>
                            {transaction.transaction_type === 'credited' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Show Less button - positioned directly below the transactions list */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                    onClick={() => setDisplayCount(4)}
                  >
                    Show Less
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isModalOpen}
        onClose={closeTransactionDetails}
        onTransactionUpdated={handleTransactionUpdated}
      />
    </>
  );
}
