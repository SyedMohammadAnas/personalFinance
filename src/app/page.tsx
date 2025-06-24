'use client';

import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/backgroundMain.jpg"
          alt="Main background"
          fill
          priority
          className="object-cover brightness-110"
          quality={100}
        />
        <div className="absolute inset-0 bg-[#0A0F1A]/40" /> {/* Dark overlay for better readability */}
      </div>

      <header className="bg-white/10 backdrop-blur-sm shadow-lg sticky top-0 z-10 text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
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
                  <span className="text-sm font-medium text-gray-200 hidden md:inline">
                    {session?.user?.name || session?.user?.email}
                  </span>
                </div>
                <Button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-red-500 border-gray-500 text-gray-200 hover:bg-gray-800/60"
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
      </header>

      <main className="flex-grow container mx-auto px-4 py-12 relative z-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
            Welcome to Personal Finance
          </h1>
          <p className="mt-12 text-xl text-gray-200">
            A financial app to ease your needs
          </p>

          {isAuthenticated ? (
            <div className="mt-12 p-8 bg-white/10 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold text-white text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Hello, {session?.user?.name || 'User'}!</h2>
              <p className="mt-4 text-white text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                You are now signed in with your Google account. You can access all the features of our application.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4">
                <Link
                  href="/dashboard"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg cursor-pointer">
                    <h3 className="text-2xl font-extrabold text-blue-900 text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Dashboard</h3>
                    <p className="mt-2 text-sm text-gray-200 text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      Access your personalized dashboard
                    </p>
                  </div>
                </Link>
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
