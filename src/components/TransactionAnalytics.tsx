'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define the transaction data structure
interface Transaction {
  id: string;
  user_id: string;
  email_id: string;
  amount: number;
  name: string;
  date: string;
  time: string;
  transaction_type: 'credited' | 'debited';
  created_at: string;
}

// Calculate transaction type distribution
function getTransactionTypeDistribution(transactions: Transaction[]) {
  let credited = 0;
  let debited = 0;

  transactions.forEach(transaction => {
    if (transaction.transaction_type === 'credited') {
      credited += 1;
    } else {
      debited += 1;
    }
  });

  const total = credited + debited;
  return [
    { name: 'Credited', value: credited, percentage: Math.round((credited / total) * 100) || 0 },
    { name: 'Debited', value: debited, percentage: Math.round((debited / total) * 100) || 0 }
  ];
}

// Function to get filtered transactions based on day count
function getFilteredTransactions(transactions: Transaction[], dayCount: number) {
  if (!transactions.length || dayCount <= 0) return [];

  // Calculate cutoff date
  const today = new Date();
  const cutoffDate = new Date();
  cutoffDate.setDate(today.getDate() - dayCount);

  // Format cutoff date to YYYY-MM-DD for string comparison
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  // Filter transactions after the cutoff date
  return transactions.filter(transaction => {
    return transaction.date >= cutoffDateStr;
  });
}

// Calculate total amounts with filtered transactions
function getTotalAmounts(transactions: Transaction[]) {
  let totalCredited = 0;
  let totalDebited = 0;

  transactions.forEach(transaction => {
    if (transaction.transaction_type === 'credited') {
      totalCredited += transaction.amount;
    } else {
      totalDebited += transaction.amount;
    }
  });

  return { totalCredited, totalDebited };
}

// Prepare data for the spending line graph - focus only on debited transactions
function prepareSpendingData(transactions: Transaction[], dayCount: number) {
  // Filter transactions by day count first
  const filteredTransactions = getFilteredTransactions(transactions, dayCount);

  // Create a map to store daily spending (debited amounts only)
  const dailySpending: Record<string, number> = {};

  // Get the date range - if we have transactions, use their dates, otherwise use the last dayCount days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dayCount + 1);

  // Generate all dates in the range
  const dates: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  // Initialize spending for each date (even if no spending occurred)
  dates.forEach(date => {
    dailySpending[date] = 0;
  });

  // Add up all debited amounts for each date
  filteredTransactions.forEach(transaction => {
    if (transaction.transaction_type === 'debited') {
      dailySpending[transaction.date] = (dailySpending[transaction.date] || 0) + transaction.amount;
    }
  });

  // Prepare data points for the graph
  return dates.map(date => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    return {
      date,
      formattedDate,
      amount: dailySpending[date] || 0
    };
  });
}

interface SpendingTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { formattedDate: string; amount: number } }>;
  label?: string;
}
const SpendingTooltip = ({ active, payload }: SpendingTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0F172A] border border-gray-800 rounded-lg shadow-lg p-2">
        <p className="text-white font-medium">{data.formattedDate}</p>
        <p className="text-red-400">₹{data.amount.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; percentage: number } }>;
}
const PieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0F172A] border border-gray-800 rounded-lg shadow-lg p-2">
        <p className="text-white font-medium">{data.name}</p>
        <p className="text-xs text-gray-400">{data.value} transactions</p>
        <p className="text-white font-medium">{data.percentage}%</p>
      </div>
    );
  }
  return null;
};

// COLORS
const COLORS = {
  credited: '#22c55e', // green-500
  debited: '#ef4444',  // red-500
  background: '#0F172A',
  text: '#f8fafc',
  grid: '#1e293b',
  border: '#475569'
};

export default function TransactionAnalytics() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dayCount, setDayCount] = useState<number>(5); // Default to show 5 days - matches screenshot

  useEffect(() => {
    // Fetch transactions data from the user's specific table
    const fetchTransactions = async () => {
      try {
        if (!session?.user?.email) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Get table name based on user email - create a safe table name
        const safeEmail = session.user.email.toLowerCase().replace(/[@.]/g, '_');
        const tableName = `transactions_${safeEmail}`;

        // Fetch transactions with proper sorting - newest first
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('date', { ascending: false })
          .order('time', { ascending: false });

        if (error) {
          console.error('Error fetching transactions for analytics:', error);
          setError('Failed to load transaction data. Please try again later.');
          setTransactions([]);
        } else {
          setTransactions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error in fetchTransactions for analytics:', error);
        setError('An unexpected error occurred. Please try again later.');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch data when component mounts or session changes
    if (session?.user?.email) {
      fetchTransactions();
    }
  }, [session]);

  // Get filtered transactions based on day count
  const filteredTransactions = getFilteredTransactions(transactions, dayCount);

  // Prepare data for charts
  const spendingData = prepareSpendingData(transactions || [], dayCount);
  const distributionData = getTransactionTypeDistribution(filteredTransactions || []);
  const { totalCredited, totalDebited } = getTotalAmounts(filteredTransactions || []);

  // Handle day count changes
  const increaseDayCount = () => {
    // Max 30 days
    setDayCount(prev => Math.min(prev + 5, 30));
  };

  const decreaseDayCount = () => {
    // Min 5 days
    setDayCount(prev => Math.max(prev - 5, 5));
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <p className="text-gray-400">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-center">
        <div>
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-gray-400 text-sm">
            Make sure you have authorized Gmail access in the Settings page.
          </p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-center">
        <div>
          <p className="text-gray-400 mb-2">No transaction data available yet.</p>
          <p className="text-gray-400 text-sm">
            Go to Settings to authorize Gmail access and refresh your transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Card */}
        <Card className="bg-[#111827] border border-gray-800">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <CardTitle className="text-white">Total Income</CardTitle>
            <CardDescription className="text-gray-400">
              Last {dayCount} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-green-400">
                ₹{totalCredited.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card className="bg-[#111827] border border-gray-800">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </div>
            <CardTitle className="text-white">Total Expenses</CardTitle>
            <CardDescription className="text-gray-400">
              Last {dayCount} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-red-400">
                ₹{totalDebited.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Line Graph with Recharts */}
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Spending Over Time</CardTitle>
            <CardDescription className="text-gray-400">
              Daily expenses over the last {dayCount} days
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={decreaseDayCount}
              disabled={dayCount <= 5}
              className="h-8 w-8 p-0 border-gray-700 bg-gray-800 hover:bg-gray-700"
            >
              <ChevronLeft className="h-4 w-4 text-gray-400" />
            </Button>
            <span className="text-xs text-gray-400">{dayCount} days</span>
            <Button
              variant="outline"
              size="sm"
              onClick={increaseDayCount}
              disabled={dayCount >= 30}
              className="h-8 w-8 p-0 border-gray-700 bg-gray-800 hover:bg-gray-700"
            >
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={spendingData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.debited} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.debited} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={COLORS.grid}
                  opacity={0.15}
                  vertical={true}
                  horizontal={true}
                />
                <XAxis
                  dataKey="formattedDate"
                  stroke={COLORS.text}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: COLORS.grid, opacity: 0.3 }}
                  tick={{ fill: COLORS.text, opacity: 0.5 }}
                />
                <YAxis
                  stroke={COLORS.text}
                  fontSize={12}
                  tickFormatter={(value) => `₹${value}`}
                  axisLine={{ stroke: COLORS.grid, opacity: 0.3 }}
                  tickLine={false}
                  tick={{ fill: COLORS.text, opacity: 0.5 }}
                  width={60}
                />
                <Tooltip content={<SpendingTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={COLORS.debited}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                  dot={{
                    fill: COLORS.debited,
                    stroke: COLORS.background,
                    strokeWidth: 2,
                    r: 5
                  }}
                  activeDot={{
                    fill: COLORS.debited,
                    stroke: COLORS.background,
                    strokeWidth: 2,
                    r: 6,
                    opacity: 1
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Type Distribution - Pie Chart */}
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Transaction Distribution</CardTitle>
          <CardDescription className="text-gray-400">
            Percentage of credited vs debited transactions for the last {dayCount} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  labelLine={false}
                >
                  <Cell key="credited" fill={COLORS.credited} />
                  <Cell key="debited" fill={COLORS.debited} />
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.credited }}></div>
              <span className="text-sm text-gray-400">Credited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.debited }}></div>
              <span className="text-sm text-gray-400">Debited</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
