# Bank Email Transaction Tracker

A Next.js application that reads bank transaction emails from users' Gmail accounts and stores the transaction data in Supabase for analysis and tracking.

## Features

- Google OAuth authentication for secure access to users' Gmail accounts
- Automatically reads bank emails for transaction data
- Stores raw email content in user-specific Supabase tables
- Scheduled background processing to keep transaction data up-to-date
- (Future) Parsing of email content to extract transaction details

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript**
- **Tailwind CSS** for styling
- **NextAuth.js** for authentication
- **Google OAuth** for Gmail API access
- **Supabase** for data storage

## Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account
- Google Cloud Platform account with OAuth credentials

### Environment Variables

Copy the `.env.example` file to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Be sure to set:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from Google Cloud)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (same as your Google Client ID)
- `NEXTAUTH_URL` and `NEXTAUTH_SECRET`
- `EMAIL_PROCESSOR_API_KEY` and `CRON_SECRET_KEY` (generate random strings)

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Gmail API
4. Create OAuth credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000` (dev) and your production URL
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000/api/auth/google-token`
     - Also add these paths for your production domain
5. Add the Client ID and Client Secret to your `.env.local` file
6. Add your email to the list of test users in the OAuth consent screen settings

### Supabase Setup

1. Create a new Supabase project
2. Run the following SQL scripts in the Supabase SQL editor in this order:

   First, run the token table SQL:
   ```sql
   -- From src/lib/migrations/create-tokens-table.sql
   -- Enable UUID extension
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

   -- Create the user_tokens table with simplified structure
   CREATE TABLE IF NOT EXISTS "user_tokens" (
     "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     "user_id" TEXT NOT NULL,
     "access_token" TEXT NOT NULL,
     "refresh_token" TEXT,
     "expiry_date" BIGINT,
     "scope" TEXT,
     "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Create function to ensure the table exists
   CREATE OR REPLACE FUNCTION create_tokens_table_if_not_exists()
   RETURNS VOID AS $$
   BEGIN
     -- Table creation is handled by the CREATE TABLE IF NOT EXISTS above
     -- This function exists as a convenience for calling from the application
     RAISE NOTICE 'Ensuring user_tokens table exists';
   END;
   $$ LANGUAGE plpgsql;
   ```

   Then, run the email tables SQL:
   ```sql
   -- From src/lib/migrations/email-tables.sql
   -- Create functions for email tables
   ```

   Finally, run the transactions table SQL:
   ```sql
   -- From transactions-table.sql
   -- Create functions for transaction tables
   ```

3. Add your Supabase URL and anon key to `.env.local`

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Usage

1. Users sign in with Google OAuth
2. Grant permission to read their Gmail
3. The application will automatically start reading bank emails
4. Transaction data will be stored in Supabase

## Troubleshooting Common Issues

### Failed to Store Tokens Error

If you get a "Failed to store tokens" error:

1. Make sure you've run the SQL scripts in Supabase
2. Verify your environment variables are correct
3. Add your Google account to the test users list in OAuth settings
4. Try using an incognito window if you have multiple Google accounts
5. Clear browser cookies and cache

### Authentication Issues

If you have issues with the Google OAuth flow:

1. Double-check your redirect URIs in Google Cloud
2. Make sure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in your environment
3. Verify you're using the same Google account that's on the test users list
4. Check browser console for any JavaScript errors

## License

MIT
