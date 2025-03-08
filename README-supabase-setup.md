# Supabase Setup Instructions

Follow these steps to set up your Supabase database for this application:

## Step 1: Create the Users Table

You need to create a "users" table in your Supabase project. This can be done in two ways:

### Option 1: Using the Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to the SQL Editor
4. Copy the contents of the `supabase-setup.sql` file in this project
5. Paste it into the SQL Editor
6. Click "Run" to execute the SQL

### Option 2: Using the Table Editor

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to "Table Editor"
4. Click "Create a new table"
5. Set the table name to "users"
6. Add the following columns:
   - `id` (type: text, primary key, not null)
   - `email` (type: text, unique, not null)
   - `name` (type: text)
   - `image_url` (type: text)
   - `created_at` (type: timestamptz, default: now())
   - `last_login` (type: timestamptz, default: now())
7. Click "Save" to create the table

## Step 2: Configure Row Level Security (RLS)

After creating the table, you need to set up permissions:

1. Go to "Authentication" > "Policies" in the Supabase Dashboard
2. Find the "users" table
3. Enable Row Level Security (RLS) if it's not already enabled
4. Add the following policies:

   **Allow all users to insert records**
   - Name: "Allow anon insert"
   - Operation: INSERT
   - Policy definition: `true`

   **Allow users to read their own data**
   - Name: "Users can view their own data"
   - Operation: SELECT
   - Policy definition: `auth.uid() = id`

   **Allow users to update their own data**
   - Name: "Users can update their own data"
   - Operation: UPDATE
   - Policy definition: `auth.uid() = id`

## Step 3: Verify Your Setup

Once you've completed the above steps:

1. Restart your Next.js development server
2. Visit the `/test-supabase` page in your application
3. Sign in with your Google account
4. You should see successful connection and user storage confirmations

If you encounter issues, check the detailed error messages on the test page and the console logs for more information.

## Troubleshooting

Common issues and solutions:

1. **"Table does not exist" error (code 42P01)**
   - This means you need to create the "users" table as described above.

2. **Permission denied error (code 42501)**
   - This means you need to configure Row Level Security policies correctly.

3. **Connection failed**
   - Verify your Supabase URL and anon key in the `.env.local` file.

4. **Unique constraint violation (code 23505)**
   - This happens if you try to insert a user with an email that already exists in the table.
   - It's usually harmless, as the application will just update the existing user.
