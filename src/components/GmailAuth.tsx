/**
 * Gmail Authorization Component
 *
 * This component handles the authorization flow for Gmail access.
 * It provides a button for users to grant permission to access their Gmail.
 */

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function GmailAuth() {
  const { data: session } = useSession();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to initiate Gmail authorization
  const authorizeGmail = async () => {
    try {
      setIsAuthorizing(true);
      setAuthStatus('idle');
      setErrorMessage(null);

      // Make sure the user is logged in
      if (!session || !session.user) {
        setErrorMessage('You must be logged in to authorize Gmail access.');
        setAuthStatus('error');
        return;
      }

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
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setAuthStatus('error');
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold">Gmail Authorization</h2>
      <p className="text-sm text-muted-foreground">
        To read your bank transaction emails, we need permission to access your Gmail account.
        Your data will be kept private and secure.
      </p>

      <Button
        onClick={authorizeGmail}
        disabled={isAuthorizing || !session}
        className="mt-2"
      >
        {isAuthorizing ? 'Authorizing...' : 'Authorize Gmail Access'}
      </Button>

      {authStatus === 'success' && (
        <p className="text-sm text-green-600 mt-2">
          Gmail access successfully authorized. We can now read your bank emails.
        </p>
      )}

      {authStatus === 'error' && errorMessage && (
        <p className="text-sm text-red-600 mt-2">
          Error: {errorMessage}
        </p>
      )}

      {!session && (
        <p className="text-sm text-amber-600 mt-2">
          Please sign in to authorize Gmail access.
        </p>
      )}
    </div>
  );
}
