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
    <div className="flex flex-col min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/pool-background.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Blurred Header */}
      <header className="relative z-10 backdrop-blur-md bg-black/30 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-lg">
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
                    <div className="w-8 h-8 rounded-full bg-teal-200 flex items-center justify-center text-teal-600">
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
                  className="flex items-center gap-2 border-gray-300 text-gray-100 hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 border border-white/30 rounded-md shadow-sm text-sm font-medium text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl sm:tracking-tight lg:text-6xl drop-shadow-lg">
            Welcome to Personal Finance
          </h1>
          <p className="mt-6 text-xl text-white drop-shadow-md">
            A financial app to ease your needs
          </p>

          {isAuthenticated ? (
            <div className="mt-12 p-8 bg-black/40 backdrop-blur-md rounded-lg shadow-xl border border-white/10">
              <h2 className="text-2xl font-bold text-white">Hello, {session?.user?.name || 'User'}!</h2>
              <p className="mt-4 text-gray-100">
                You are now signed in with your Google account. You can access all the features of our application.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link
                  href="/profile"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg cursor-pointer hover:bg-white/20">
                    <h3 className="font-semibold text-teal-300">Profile</h3>
                    <p className="mt-2 text-sm text-gray-200">
                      View and edit your profile information
                    </p>
                  </div>
                </Link>
                <Link
                  href="/dashboard"
                  className="block transition-transform hover:scale-105 hover:shadow-md"
                >
                  <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg cursor-pointer hover:bg-white/20">
                    <h3 className="font-semibold text-teal-300">Dashboard</h3>
                    <p className="mt-2 text-sm text-gray-200">
                      Access your personalized dashboard
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-12">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-4 text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 shadow-lg transform transition-transform hover:scale-105"
              >
                Get started
              </Link>
              <p className="mt-4 text-sm text-white/80 drop-shadow-md">
                Sign in with your Google account to get started
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Blurred Footer */}
      <footer className="relative z-10 py-6 backdrop-blur-md bg-black/30">
        <div className="container mx-auto px-4">
          <div className="h-8"></div> {/* Blank space in footer as requested */}
        </div>
      </footer>
    </div>
  );
}
