'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import TransactionList from '@/components/TransactionList';
import GmailAuth from '@/components/GmailAuth';
import { HomeIcon, LayoutDashboardIcon, UserIcon, BarChartIcon, Settings, Copy, Check, Shield, Mail, RefreshCcw } from 'lucide-react';
import TransactionAnalytics from '@/components/TransactionAnalytics';
import ProfileImage from '@/components/ProfileImage';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Transaction type interface
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

// Latest Transaction Card Component
function LatestTransactionCard({
  transaction,
  type
}: {
  transaction: Transaction | null;
  type: 'credited' | 'debited';
}) {
  const isCredit = type === 'credited';

  if (!transaction) {
    return (
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader className="pb-2">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${isCredit ? 'text-green-400' : 'text-red-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isCredit ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"}
              />
            </svg>
          </div>
          <CardTitle className="text-white">
            {isCredit ? 'Latest Income' : 'Latest Expense'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">No transactions found</p>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <Card className="bg-[#111827] border border-gray-800">
      <CardHeader className="pb-2">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${isCredit ? 'text-green-400' : 'text-red-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isCredit ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"}
            />
          </svg>
        </div>
        <CardTitle className="text-white">
          {isCredit ? 'Latest Income' : 'Latest Expense'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <p className="text-sm font-medium text-white truncate max-w-[200px]">
              {transaction.name}
            </p>
            <p className={`text-base font-semibold ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
              {isCredit ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-xs text-gray-400">
            {formattedDate} • {transaction.time}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [pathname, setPathname] = useState('/dashboard');
  const [activeView, setActiveView] = useState('dashboard'); // initialize to dashboard view
  const [isCopied, setIsCopied] = useState(false);
  const [latestCredited, setLatestCredited] = useState<Transaction | null>(null);
  const [latestDebited, setLatestDebited] = useState<Transaction | null>(null);

  // Split the effects to avoid dependency array issues
  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      setLoading(false);

      // Fetch latest transactions when authenticated
      if (session?.user?.email) {
        fetchLatestTransactions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  // Separate effect for time-related updates
  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Update current time
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  // Effect for automatic refresh of latest transactions
  useEffect(() => {
    if (status === 'authenticated') {
      // Set up automatic refresh timer for latest transactions
      const refreshInterval = setInterval(() => {
        fetchLatestTransactions();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [status]);

  // Function to fetch latest transactions for external calls (like refresh)
  const fetchLatestTransactions = async () => {
    if (!session?.user?.email) return;

    try {
      console.log('Dashboard: Fetching latest transactions...');
      // Get table name based on user email
      const safeEmail = session.user?.email?.toLowerCase().replace(/[@.]/g, '_') || '';
      const tableName = `transactions_${safeEmail}`;

      // Try to fetch all transactions first to ensure we have data
      const { data: allTransactions, error: allError } = await supabase
        .from(tableName)
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false })
        .limit(10);

      if (allError) {
        console.error('Error fetching all transactions:', allError);
        // Reset states to prevent reference errors
        setLatestCredited(null);
        setLatestDebited(null);
        return;
      }

      // If no transactions are found, clear the state
      if (!allTransactions || allTransactions.length === 0) {
        console.log('No transactions found in table');
        setLatestCredited(null);
        setLatestDebited(null);
        return;
      }

      console.log(`Found ${allTransactions.length} total transactions`);

      // Filter transactions by type
      const creditedTransactions = allTransactions.filter(t =>
        t.transaction_type === 'credited' || t.transaction_type === 'Credited');

      const debitedTransactions = allTransactions.filter(t =>
        t.transaction_type === 'debited' || t.transaction_type === 'Debited');

      // Set latest transactions of each type
      if (creditedTransactions && creditedTransactions.length > 0) {
        console.log('Latest credited transaction:', creditedTransactions[0]);
        setLatestCredited(creditedTransactions[0]);
      } else {
        // No credited transactions found
        console.log('No credited transactions found');
        setLatestCredited(null);
      }

      if (debitedTransactions && debitedTransactions.length > 0) {
        console.log('Latest debited transaction:', debitedTransactions[0]);
        setLatestDebited(debitedTransactions[0]);
      } else {
        // No debited transactions found
        console.log('No debited transactions found');
        setLatestDebited(null);
      }
    } catch (error) {
      console.error('Error fetching latest transactions:', error);
      // Reset states to prevent reference errors on failed fetch
      setLatestCredited(null);
      setLatestDebited(null);
    }
  };

  // Function to copy user ID to clipboard
  const copyToClipboard = () => {
    if (session?.user?.id) {
      navigator.clipboard.writeText(session.user.id);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Function to authorize Gmail access
  const authorizeGmail = async () => {
    try {
      // Create the OAuth URL
      const redirectUri = `${window.location.origin}/api/auth/google-token`;

      // Construct the Google OAuth URL
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
      googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
      googleAuthUrl.searchParams.append('response_type', 'code');
      googleAuthUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/gmail.readonly');
      googleAuthUrl.searchParams.append('access_type', 'offline');
      googleAuthUrl.searchParams.append('prompt', 'consent');

      // Redirect the user to the Google authorization page
      window.location.href = googleAuthUrl.toString();
    } catch (error) {
      console.error('Error authorizing Gmail:', error);
      alert('Error authorizing Gmail. Please try again later.');
    }
  };

  // Function to unlink Google authorization
  const unlinkGoogleAuth = async () => {
    try {
      if (!confirm('Are you sure you want to revoke Gmail access? This will disconnect your Gmail account from the app.')) {
        return;
      }

      const response = await fetch('/api/auth/revoke-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to revoke Google authorization:', result.error);
        alert('Failed to unlink Google account. Please try again later.');
        return;
      }

      alert('Successfully unlinked your Google account.');
      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error unlinking Google account:', error);
      alert('An error occurred while unlinking your Google account. Please try again later.');
    }
  };

  // Function to delete all transactions
  const deleteAllTransactions = async () => {
    try {
      if (!confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.')) {
        return;
      }

      const response = await fetch('/api/transactions/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to delete all transactions:', result.error);
        alert('Failed to delete all transactions. Please try again later.');
        return;
      }

      alert('Successfully deleted all transactions.');
      // Refresh the page to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error deleting all transactions:', error);
      alert('An error occurred while deleting transactions. Please try again later.');
    }
  };

  const renderAccountSettings = () => (
    <div className="grid gap-6">
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-white">Account Settings</h3>
        <p className="text-sm text-gray-400">Manage your account preferences and connections</p>
      </div>

      {/* Email Integration Section */}
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Email Integration</CardTitle>
          <CardDescription className="text-gray-400">
            Connect your Gmail account to read bank transaction emails. Your data will be kept private and secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
              <Button
                onClick={unlinkGoogleAuth}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                Unlink Google Account
              </Button>
          </div>
            <div>
              <Button
                onClick={() => authorizeGmail()}
                className="bg-gray-800 hover:bg-gray-700 text-white"
              >
                Authorize Gmail Access
              </Button>
        </div>
      </div>
        </CardContent>
      </Card>

      {/* Account Security Section */}
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Account Security</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
              <Label htmlFor="two-factor" className="text-white">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-400">
              Add an extra layer of security to your account
            </p>
          </div>
          <Switch
            id="two-factor"
            checked={twoFactorEnabled}
            onCheckedChange={setTwoFactorEnabled}
          />
        </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications" className="text-white">Email Notifications</Label>
              <p className="text-sm text-gray-400">
                Receive email notifications for account activity
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card className="bg-[#111827] border border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Data Management</CardTitle>
          <CardDescription className="text-gray-400">
            Manage your transaction data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">
                Delete all transaction data from your account. This action cannot be undone.
              </p>
            </div>
            <Button
              onClick={deleteAllTransactions}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete All Transactions
            </Button>
      </div>
        </CardContent>
      </Card>

      <Button className="w-full sm:w-auto bg-gray-800 hover:bg-gray-700 text-white">Save Settings</Button>
    </div>
  );

  // Set initial active view based on the URL when component mounts
  useEffect(() => {
    // If we're on the dashboard page, set activeView to 'dashboard'
    if (window.location.pathname === '/dashboard') {
      setActiveView('dashboard');
    } else if (window.location.pathname === '/') {
      setActiveView('home');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-sm text-muted-foreground">Please wait while we set up your dashboard</p>
        </div>
      </div>
    );
  }

  // Handle sidebar button clicks
  const handleNavClick = (view: string) => {
    // Only handle special views that don't navigate to a new page
    if (view === 'home' || view === 'dashboard' || view === 'analytics' || view === 'profile' || view === 'settings') {
      setActiveView(view);
      // Don't set pathname to anything here
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background image with overlay */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/images/TopoBackground.jpg')`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      >
        {/* Dark overlay for better contrast */}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Main content with glass effect for center elements */}
      <div className="relative z-10 h-full">
        <div className="container mx-auto p-4">
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Side Panel */}
            <div className="lg:col-span-3 rounded-xl overflow-hidden">
              {/* User card with glassmorphism */}
              <div className="bg-[#0E1525]/80 backdrop-blur-md rounded-xl p-6 shadow-xl">
                {/* User Profile Section */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-teal-400 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {session?.user?.name?.split(" ").map(name => name[0]).join("") || "U"}
                    </div>
                  </div>
                  <h2 className="text-xl text-white mt-4 text-center">{session?.user?.name || "User"}</h2>
                  <div className="mt-4 w-full">
                    <div className="text-gray-400 text-center">
                      {formatDate(currentTime)}
                    </div>
                    <div className="text-4xl font-semibold text-white text-center mt-1">
                      {formatTime(currentTime)}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="mt-8 space-y-2">
                  <button
                    onClick={() => handleNavClick('home')}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                      activeView === 'home' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#1C2333]/50 text-gray-300'
                    }`}
                  >
                    <HomeIcon className="h-5 w-5" />
                    <span>Home</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('profile')}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                      activeView === 'profile' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#1C2333]/50 text-gray-300'
                    }`}
                  >
                    <UserIcon className="h-5 w-5" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                      activeView === 'dashboard' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#1C2333]/50 text-gray-300'
                    }`}
                  >
                    <LayoutDashboardIcon className="h-5 w-5" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('analytics')}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                      activeView === 'analytics' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#1C2333]/50 text-gray-300'
                    }`}
                  >
                    <BarChartIcon className="h-5 w-5" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('settings')}
                    className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                      activeView === 'settings' ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-[#1C2333]/50 text-gray-300'
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="lg:col-span-9 space-y-4">
              {/* Content based on active view */}
              <div className="bg-[#0E1525]/70 backdrop-blur-md rounded-xl p-6 shadow-xl">
                {activeView === 'home' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Latest Credited Transaction */}
                      <div className="bg-[#131b2e]/70 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center mb-3">
                          <ArrowDownCircle className="h-5 w-5 text-green-400 mr-2" />
                          <h3 className="text-lg text-white">Latest Income</h3>
                        </div>
                        <LatestTransactionCard
                          transaction={latestCredited}
                          type="credited"
                        />
                      </div>

                      {/* Latest Debited Transaction */}
                      <div className="bg-[#131b2e]/70 backdrop-blur-sm rounded-xl p-4">
                        <div className="flex items-center mb-3">
                          <ArrowUpCircle className="h-5 w-5 text-red-400 mr-2" />
                          <h3 className="text-lg text-white">Latest Expense</h3>
                        </div>
                        <LatestTransactionCard
                          transaction={latestDebited}
                          type="debited"
                        />
                      </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="mt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg text-white">Recent Transactions</h3>
                        <div className="flex items-center gap-2">
                          <AddTransactionButton onTransactionAdded={fetchLatestTransactions} />
                          <Select
                            value={dateFilter}
                            onValueChange={(value) => setDateFilter(value)}
                          >
                            <SelectTrigger className="h-9 w-[100px] bg-[#191F2E] border-gray-700 text-gray-200">
                              <div className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-2" />
                                <SelectValue>{dateFilter}</SelectValue>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#191F2E] border-gray-700">
                              <SelectItem value="7 days">7 days</SelectItem>
                              <SelectItem value="14 days">14 days</SelectItem>
                              <SelectItem value="30 days">30 days</SelectItem>
                              <SelectItem value="60 days">60 days</SelectItem>
                              <SelectItem value="90 days">90 days</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 gap-2 bg-[#191F2E] border-gray-700 text-gray-200 hover:bg-gray-800"
                            onClick={fetchLatestTransactions}
                          >
                            <RefreshCcw className="h-4 w-4" />
                            Refresh
                          </Button>
                        </div>
                      </div>

                      {/* Transaction list */}
                      <div className="space-y-2 mt-2">
                        {isLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                          </div>
                        ) : transactions.length > 0 ? (
                          <>
                            {transactions.map((transaction, index) => (
                              <div
                                key={index}
                                className="bg-[#131b2e]/70 backdrop-blur-sm rounded-lg px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-[#1A2335] transition"
                                onClick={() => handleTransactionClick(transaction)}
                              >
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    transaction.transaction_type === 'credited' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                                  }`}>
                                    {transaction.transaction_type === 'credited' ?
                                      <ArrowDown className="h-4 w-4" /> :
                                      <ArrowUp className="h-4 w-4" />
                                    }
                                  </div>
                                  <div className="ml-3">
                                    <div className="font-medium text-white">{transaction.name}</div>
                                    <div className="text-xs text-gray-400">
                                      {new Date(transaction.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })} • {transaction.time}
                                    </div>
                                  </div>
                                </div>
                                <div className={`font-medium ${
                                  transaction.transaction_type === 'credited' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {transaction.transaction_type === 'credited' ? '+' : '-'}₹{transaction.amount?.toFixed(2)}
                                </div>
                              </div>
                            ))}

                            {/* View More Button */}
                            <div className="flex justify-center mt-4">
                              <Button
                                variant="link"
                                className="text-blue-400 hover:text-blue-300"
                                onClick={() => handleNavClick('dashboard')}
                              >
                                View More
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            No transactions found. Add some transactions to get started.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'profile' && renderUserProfile()}
                {activeView === 'dashboard' && renderFullDashboard()}
                {activeView === 'analytics' && renderAnalytics()}
                {activeView === 'settings' && renderAccountSettings()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals and Toasts */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onDelete={() => {
            setSelectedTransaction(null);
            fetchLatestTransactions();
          }}
          onUpdate={fetchLatestTransactions}
        />
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
