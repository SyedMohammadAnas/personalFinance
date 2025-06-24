'use client';

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, Home as HomeIcon, User, BarChart3, Settings, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // State for sidebar and time/date
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time and date
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Navigation options for sidebar
  const navigationOptions = [
    { name: 'Home', icon: HomeIcon, href: '/', active: true },
    { name: 'Dashboard', icon: BarChart3, href: '/dashboard' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Transactions', icon: CreditCard, href: '/transactions' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/water-background.jpeg"
          alt="Water background"
          fill
          priority
          className="object-cover brightness-110"
          quality={100}
        />
        <div className="absolute inset-0 bg-[#0A0F1A]/40" />
      </div>

      {/* Mobile Top Bar */}
      <header className="border-b border-gray-800/40 bg-[#0A0F1A]/90 backdrop-blur-md shadow-lg sticky top-0 z-50">
        <div className="px-4 py-3">
          {/* Mobile Layout */}
          <div className="flex items-center justify-between lg:hidden">
            {/* Left: Menu Button */}
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-800/60 p-2"
            >
              <Menu className="h-6 w-6" />
            </Button>

            {/* Center: Time and Date */}
            <div className="flex flex-col items-center">
              <div className="text-white text-lg font-semibold">
                {formatTime(currentTime)}
              </div>
              <div className="text-gray-300 text-xs">
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Right: Profile Picture and Username */}
            {isAuthenticated && (
              <div className="flex items-center space-x-2">
                {session?.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt="Profile picture"
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 border-2 border-gray-300">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium leading-tight">
                    {session?.user?.name?.split(' ')[0] || 'User'}
                  </span>
                </div>
              </div>
            )}

            {/* If not authenticated, show sign in button */}
            {!isAuthenticated && !isLoading && (
              <Link
                href="/login"
                className="text-white text-sm font-medium px-3 py-1 border border-gray-600 rounded-md bg-gray-800/60"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Desktop Layout (unchanged) */}
          <div className="hidden lg:flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Image
                src="/personalFinanceLogo.png"
                alt="Personal Finance Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-xl font-semibold text-white">Personal Finance</span>
            </div>

            <div>
              {isLoading ? (
                <div className="animate-pulse w-24 h-8 bg-gray-800/60 rounded-md"></div>
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {session?.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt="Profile picture"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-200">
                      {session?.user?.name || session?.user?.email}
                    </span>
                  </div>
                  <Button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-gray-500 text-gray-200 hover:bg-gray-800/60"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </Button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-800/60 hover:bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ring-2 ring-white/20"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-[#0A0F1A]/95 backdrop-blur-md transform transition-transform duration-300 ease-in-out z-50 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/40">
          <div className="flex items-center space-x-2">
            <Image
              src="/personalFinanceLogo.png"
              alt="Personal Finance Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-lg font-semibold text-white">Personal Finance</span>
          </div>
          <Button
            onClick={() => setSidebarOpen(false)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-gray-800/60 p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info Section */}
        {isAuthenticated && (
          <div className="p-4 border-b border-gray-800/40">
            <div className="flex items-center space-x-3">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt="Profile picture"
                  width={48}
                  height={48}
                  className="rounded-full border-2 border-gray-300"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 text-lg font-semibold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-white font-medium">
                  {session?.user?.name || 'User'}
                </span>
                <span className="text-gray-400 text-sm">
                  {session?.user?.email}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Options */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationOptions.map((option) => (
              <li key={option.name}>
                <Link
                  href={option.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
                    option.active
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                  }`}
                >
                  <option.icon className="h-5 w-5" />
                  <span className="font-medium">{option.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign Out Button */}
        {isAuthenticated && (
          <div className="p-4 border-t border-gray-800/40">
            <Button
              onClick={() => {
                setSidebarOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-gray-500 text-gray-200 hover:bg-gray-800/60"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12 relative z-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Welcome to Personal Finance
          </h1>
          <p className="mt-6 text-xl text-gray-200">
            A financial app to ease your needs
          </p>

          {isAuthenticated ? (
            <div className="mt-12 p-8 bg-[#111827]/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700">
              <h2 className="text-2xl font-bold text-white">Hello, {session?.user?.name || 'User'}!</h2>
              <p className="mt-4 text-gray-200">
                You are now signed in with your Google account. You can access all the features of our application.
              </p>

              {/* Desktop Navigation Cards - Hidden on Mobile */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:block hidden">
                <Link
                  href="/profile"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-[#1E293B]/80 backdrop-blur-sm rounded-lg cursor-pointer">
                    <h3 className="font-semibold text-indigo-400">Profile</h3>
                    <p className="mt-2 text-sm text-gray-200">
                      View and edit your profile information
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-[#1E293B]/80 backdrop-blur-sm rounded-lg cursor-pointer">
                    <h3 className="font-semibold text-indigo-400">Dashboard</h3>
                    <p className="mt-2 text-sm text-gray-200">
                      Access your personalized dashboard
                    </p>
                  </div>
                </Link>
              </div>

              {/* Mobile Quick Actions */}
              <div className="mt-8 lg:hidden">
                <p className="text-gray-300 text-sm mb-4">
                  Use the menu button ☰ in the top bar to access all features
                </p>
                <Button
                  onClick={() => setSidebarOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
                >
                  Open Menu
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-3 border-4 border-white/90 text-base font-bold rounded-lg text-white bg-blue-400 hover:bg-blue-900 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              >
                Get started
              </Link>
              <p className="mt-3 text-sm text-gray-200">
                Sign in with your Google account to get started
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
