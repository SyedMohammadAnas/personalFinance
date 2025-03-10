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
    <div className="flex flex-col min-h-screen bg-[#0A0F1A]">
      <header className="border-b border-gray-800 bg-[#0A0F1A] shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <span className="text-xl font-semibold text-white">Personal Finance</span>
          </div>

          <div>
            {isLoading ? (
              <div className="animate-pulse w-24 h-8 bg-gray-800 rounded-md"></div>
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
                  <span className="text-sm font-medium text-gray-300 hidden md:inline">
                    {session?.user?.name || session?.user?.email}
                  </span>
                </div>
                <Button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Welcome to Personal Finance
          </h1>
          <p className="mt-6 text-xl text-gray-300">
            A financial app to ease your needs
          </p>

          {isAuthenticated ? (
            <div className="mt-12 p-8 bg-[#111827] rounded-lg shadow-lg border border-gray-800">
              <h2 className="text-2xl font-bold text-white">Hello, {session?.user?.name || 'User'}!</h2>
              <p className="mt-4 text-gray-300">
                You are now signed in with your Google account. You can access all the features of our application.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link
                  href="/profile"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-[#1E293B] rounded-lg cursor-pointer">
                    <h3 className="font-semibold text-indigo-400">Profile</h3>
                    <p className="mt-2 text-sm text-gray-300">
                      View and edit your profile information
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-[#1E293B] rounded-lg cursor-pointer">
                    <h3 className="font-semibold text-indigo-400">Dashboard</h3>
                    <p className="mt-2 text-sm text-gray-300">
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
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Get started
              </Link>
              <p className="mt-3 text-sm text-gray-300">
                Sign in with your Google account to get started
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
