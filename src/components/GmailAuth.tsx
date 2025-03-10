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
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-white mb-2">Email Integration</h3>
          <p className="text-sm text-gray-400">
            Connect your Gmail account to read bank transaction emails.
            Your data will be kept private and secure.
          </p>
        </div>

        <div className="flex-shrink-0">
          <Button
            onClick={authorizeGmail}
            disabled={isAuthorizing || !session}
            className="whitespace-nowrap bg-gray-800 hover:bg-gray-700 text-white"
          >
            {isAuthorizing ? 'Authorizing...' : 'Authorize Gmail Access'}
          </Button>
        </div>
      </div>

      {/* Status messages in a separate row */}
      {(authStatus === 'success' || authStatus === 'error' || !session) && (
        <div className="w-full">
          {authStatus === 'success' && (
            <p className="text-sm text-green-400">
              Gmail access successfully authorized. We can now read your bank emails.
            </p>
          )}

          {authStatus === 'error' && errorMessage && (
            <p className="text-sm text-red-400">
              Error: {errorMessage}
            </p>
          )}

          {!session && (
            <p className="text-sm text-amber-400">
              Please sign in to authorize Gmail access.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
