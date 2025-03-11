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
      <Card className="h-72 p-4 border border-gray-800 rounded-md flex flex-col bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-md overflow-hidden relative">
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
    <Card className="h-72 p-4 border border-gray-800 rounded-md flex flex-col bg-gradient-to-b from-gray-800/60 to-gray-900/60 backdrop-blur-md overflow-hidden relative">
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
    <div
      className="container mx-auto py-8 px-4 min-h-screen relative"
      style={{
        backgroundImage: "url('/images/TopoBackground.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Card className="border border-gray-800 bg-[#0F172A]/90 shadow-md text-white backdrop-blur-md">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-64 border-r border-gray-800 p-6 bg-[#0F172A]/95">
              {/* User info */}
              <div className="flex flex-col items-center gap-3 border-b border-gray-800 pb-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || 'User'} />
                  <AvatarFallback className="bg-gray-700 text-lg">{session?.user?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-lg font-medium text-white">{session?.user?.name}</p>
                </div>
              </div>

              {/* Date and time */}
              <div className="mt-6 border-b border-gray-800 pb-6 text-center">
                <p className="text-base text-gray-400">{formatDate(currentTime)}</p>
                <p className="text-3xl font-bold text-white mt-1">{formatTime(currentTime)}</p>
              </div>

              {/* Navigation Links - centered with flex */}
              <div className="mt-8 flex flex-col items-center">
                <nav className="space-y-3 w-full">
                  {[
                    { name: 'Home', icon: HomeIcon, href: '/', view: null },
                    { name: 'Profile', icon: UserIcon, href: '#', view: 'profile' },
                    { name: 'Dashboard', icon: LayoutDashboardIcon, href: '#', view: 'dashboard' },
                    { name: 'Analytics', icon: BarChartIcon, href: '#', view: 'analytics' },
                    { name: 'Settings', icon: Settings, href: '#', view: 'settings' },
                  ].map((item) => (
                    <Link
                      key={item.name}
                      href={item.view ? '#' : item.href}
                      className={cn(
                        'flex items-center px-3 py-2 text-gray-400 transition-all hover:text-white rounded-lg',
                        activeView === item.view
                          ? 'bg-gray-800 text-white'
                          : 'hover:bg-gray-800'
                      )}
                      onClick={() => item.view && handleNavClick(item.view)}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 border-l border-gray-800 backdrop-blur-sm bg-[#0F172A]/80">
              {/* Dashboard View */}
              {activeView === 'dashboard' && (
                <>
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {/* Latest Credited Transaction Card */}
                    <LatestTransactionCard
                      transaction={latestCredited}
                      type="credited"
                    />
                    {/* Latest Debited Transaction Card */}
                    <LatestTransactionCard
                      transaction={latestDebited}
                      type="debited"
                    />
                  </div>

                  {/* Add the onTransactionsUpdated prop to TransactionList */}
                  <div className="mt-6">
                    <TransactionList onTransactionsUpdated={fetchLatestTransactions} />
                  </div>
                </>
              )}

              {/* Analytics View */}
              {activeView === 'analytics' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Financial Analytics</h2>
                    <p className="text-gray-400">View your transaction analytics and insights</p>
                  </div>
                  <TransactionAnalytics />
                </div>
              )}

              {/* Profile View */}
              {activeView === 'profile' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">User Profile</h2>
                    <p className="text-gray-400">Your account details and preferences</p>
                  </div>

                  <div className="grid gap-8">
                    {/* Personal Information Card */}
                    <Card className="bg-[#111827] border border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Personal Information</CardTitle>
                        <CardDescription className="text-gray-400">Your account details from Google login</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                          {/* User profile image */}
                          <div className="flex-shrink-0">
                            <ProfileImage
                              src={session?.user?.image}
                              alt={session?.user?.name || 'User'}
                              size={96}
                            />
                          </div>

                          {/* User details */}
                          <div className="space-y-4 flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm text-gray-400">Full Name</label>
                                <p className="text-white font-medium">{session?.user?.name}</p>
                              </div>

                              <div>
                                <label className="text-sm text-gray-400">Email Address</label>
                                <p className="text-white font-medium">{session?.user?.email}</p>
                              </div>
                            </div>

                            <div>
                              <label className="text-sm text-gray-400">User ID</label>
                              <div className="flex items-center space-x-2 mt-1">
                                <code className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300 w-56 truncate">
                                  {session?.user?.id || 'No ID available'}
                                </code>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 border-gray-700 bg-gray-800 hover:bg-gray-700"
                                  onClick={copyToClipboard}
                                >
                                  {isCopied ? (
                                    <Check className="h-4 w-4 text-green-400" />
                                  ) : (
                                    <Copy className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Settings View */}
              {activeView === 'settings' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                    <p className="text-gray-400">Manage your account preferences and connections</p>
                  </div>

                  <div className="grid gap-8">
                    {renderAccountSettings()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
