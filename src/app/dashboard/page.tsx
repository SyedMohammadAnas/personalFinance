'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import GmailAuth from '@/components/GmailAuth';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      setLoading(false);
    }

    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
          <p className="mt-4" style={{ color: 'var(--muted-foreground)' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bank Email Integration</CardTitle>
          <CardDescription>
            Connect your Gmail account to automatically track bank transactions from your emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GmailAuth />
        </CardContent>
      </Card>

      <div className="flex items-center mb-6">
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt="Profile"
            width={64}
            height={64}
            className="rounded-full"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <span className="text-primary font-medium text-xl">
              {session?.user?.name?.charAt(0) || 'U'}
            </span>
          </div>
        )}
        <div className="ml-4">
          <h4 className="text-lg font-medium">{session?.user?.name}</h4>
          <p className="text-muted-foreground">{session?.user?.email}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-4" asChild>
          <Link href="/profile">View Profile</Link>
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
          <div>
            <h5 className="font-medium">Email Notifications</h5>
            <p className="text-sm text-muted-foreground">Receive email updates about your account</p>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
          <div>
            <h5 className="font-medium">Two-Factor Authentication</h5>
            <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
          <Switch
            checked={twoFactorEnabled}
            onCheckedChange={setTwoFactorEnabled}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <header className="shadow-sm border-b" style={{ backgroundColor: 'var(--card)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl"
                 style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}>
              A
            </div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>AppName</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: 'var(--muted)' }}>
                  <span style={{ color: 'var(--primary)' }} className="font-medium">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <span className="ml-2 font-medium hidden md:inline-block"
                    style={{ color: 'var(--foreground)' }}>
                {session?.user?.name || session?.user?.email}
              </span>
              <Button variant="outline" size="sm" className="ml-2" asChild>
                <Link href="/profile">Profile</Link>
              </Button>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader className="bg-background border-b">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-2xl font-extrabold">
                  {greeting}, {session?.user?.name?.split(' ')[0] || 'there'}!
                </CardTitle>
                <CardDescription>
                  Welcome to your personal dashboard. Here's what's happening today.
                </CardDescription>
              </div>
              <div className="mt-4 md:mt-0">
                <div className="text-xl font-bold">
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
                <div className="text-muted-foreground">
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
                {['overview', 'analytics', 'settings'].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="py-3 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="p-6">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                  <Card className="bg-blue-50">
                    <CardHeader className="pb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <CardTitle>Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline">
                        <p className="text-2xl font-semibold text-blue-600">5</p>
                        <p className="ml-2 text-sm text-gray-600">unread messages</p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="link" className="text-blue-600 p-0">
                        View inbox →
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-green-50">
                    <CardHeader className="pb-2">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                      </div>
                      <CardTitle>Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline">
                        <p className="text-2xl font-semibold text-green-600">3</p>
                        <p className="ml-2 text-sm text-gray-600">tasks due today</p>
                      </div>
                      <div className="mt-3 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button variant="link" className="text-green-600 p-0">
                        View tasks →
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-purple-50">
                    <CardHeader className="pb-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-purple-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <CardTitle>Calendar</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">Next meeting:</p>
                      <p className="text-base font-medium text-purple-600">Team Sync at 3:00 PM</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="link" className="text-purple-600 p-0">
                        View calendar →
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                <Card className="mt-8">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle>Recent Activity</CardTitle>
                    <Button variant="link" className="text-primary p-0">
                      View all
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          title: 'Project update',
                          description: 'You updated the project status to "In Progress"',
                          time: '1 hour ago',
                          icon: (
                            <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ),
                        },
                        {
                          title: 'New comment',
                          description: 'Alex commented on your task "Implement new feature"',
                          time: '3 hours ago',
                          icon: (
                            <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          ),
                        },
                        {
                          title: 'Task completed',
                          description: 'You marked the task "Fix login bug" as complete',
                          time: '5 hours ago',
                          icon: (
                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ),
                        },
                      ].map((activity, i) => (
                        <div key={i} className="flex items-start">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center">
                            {activity.icon}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-foreground">
                              {activity.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>View your analytics data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border border-dashed border-muted-foreground/20 rounded-lg">
                      <p className="text-muted-foreground">Analytics charts coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="p-6">
                {renderAccountSettings()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-card border-t mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Your Company. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
