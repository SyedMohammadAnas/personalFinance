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

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL from `src/lib/migrations/email-tables.sql` in the Supabase SQL editor
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

## Background Email Processing

The application includes an API endpoint for processing emails that can be triggered by:

1. Vercel Cron Jobs (recommended for production)
2. Manual API calls
3. Client-side triggers

To set up a Vercel Cron Job:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-emails",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Security Considerations

- All user tokens are stored securely in Supabase with Row Level Security
- Backend API calls are protected with API keys
- Email content is only accessed with explicit user permission

## License

MIT
