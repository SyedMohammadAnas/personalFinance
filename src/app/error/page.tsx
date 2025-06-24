'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Suspense } from 'react';

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorPageContent />
    </Suspense>
  );
}

function ErrorPageContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message') || 'An unexpected error occurred';

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="bg-red-50 text-red-700 pb-6">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12" />
          </div>
          <CardTitle className="text-xl text-center">Error</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground mb-4">{message}</p>

          {message.includes('Failed to store tokens') && (
            <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mt-4">
              <h3 className="font-medium text-amber-800 mb-2">Troubleshooting Steps:</h3>
              <ul className="list-disc pl-5 text-sm space-y-1 text-amber-700">
                <li>Check that you have executed the Supabase SQL migrations</li>
                <li>Make sure your Supabase environment variables are correct</li>
                <li>Try signing out and signing in again</li>
                <li>Clear your browser cookies and cache</li>
                <li>Try authorizing Gmail from the dashboard</li>
              </ul>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
