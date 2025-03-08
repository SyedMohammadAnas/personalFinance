import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Integration Layer
 *
 * This module provides the integration between the application and Supabase,
 * handling user data storage and retrieval. It provides functions for:
 *
 * 1. Creating and updating user records
 * 2. Retrieving user data by email
 * 3. Handling error cases gracefully
 *
 * The user data model has been simplified to only include basic profile information
 * without timestamp tracking.
 */

// Initialize the Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing in environment variables');
}

/**
 * Creates a fresh Supabase client for server-side operations
 * This ensures we create a new client for each operation
 */
export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist session in server environment
    },
  });
}

// Create a single instance of the Supabase client for client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * User data structure
 */
export type UserData = {
  id: string;       // User ID (from OAuth provider)
  email: string;    // User's email address
  name?: string;    // User's display name
  image_url?: string; // User's profile image URL
};

/**
 * Validates user data before storage
 * Returns an error message if validation fails, or null if valid
 */
function validateUserData(user: any): string | null {
  if (!user) {
    return 'User object is null or undefined';
  }

  if (!user.email) {
    return 'Email is required';
  }

  if (!user.id) {
    return 'User ID is required';
  }

  return null; // Valid
}

/**
 * Stores user data in Supabase after Google authentication
 * Uses direct REST API approach to avoid client library issues
 */
export async function storeUserData(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  try {
    // Validate inputs
    if (!user.id || !user.email) {
      console.error('Missing required user data (id or email)');
      return { success: false, error: 'Missing required user data' };
    }

    // Validate Supabase credentials
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not configured in environment variables');
      return { success: false, error: 'Supabase credentials not configured' };
    }

    // Format user data for storage
    const userData = {
      id: user.id,
      email: user.email.toLowerCase().trim(),
      name: user.name || null,
      image_url: user.image || null
    };

    console.log(`Storing user data for: ${userData.email}`);

    // Check if user already exists
    try {
      const checkExistingResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(userData.email)}&select=id`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );

      const existingUsers = await checkExistingResponse.json();
      const userExists = Array.isArray(existingUsers) && existingUsers.length > 0;

      if (userExists) {
        // User exists - update their record
        console.log(`User exists, updating record`);

        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(userData.email)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: userData.name,
              image_url: userData.image_url
            })
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error(`Error updating user: ${updateResponse.status} - ${errorText}`);
          return {
            success: false,
            error: `Update failed: ${updateResponse.status} ${updateResponse.statusText}`
          };
        }

        const updateData = await updateResponse.json();
        console.log('User updated successfully');
        return { success: true, data: updateData };
      } else {
        // User doesn't exist - insert new record
        console.log(`User doesn't exist, creating new record`);

        const insertResponse = await fetch(
          `${supabaseUrl}/rest/v1/users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(userData)
          }
        );

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          console.error(`Error inserting user: ${insertResponse.status} - ${errorText}`);

          // Special handling for permission errors
          if (insertResponse.status === 401 || insertResponse.status === 403) {
            return {
              success: false,
              error: 'Permission denied. Check Row Level Security (RLS) policies in Supabase.'
            };
          }

          return {
            success: false,
            error: `Insert failed: ${insertResponse.status} ${insertResponse.statusText}`
          };
        }

        const insertData = await insertResponse.json();
        console.log('User inserted successfully');
        return { success: true, data: insertData };
      }
    } catch (fetchError) {
      console.error('Error during fetch operation:', fetchError);
      return {
        success: false,
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error during fetch'
      };
    }
  } catch (error) {
    console.error('Error in storeUserData:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Retrieves user data from Supabase by email
 */
export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    // Validate inputs
    if (!email) {
      console.error('Email is required for getUserByEmail');
      return null;
    }

    // Validate Supabase credentials
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not configured');
      return null;
    }

    // Use direct REST API approach for consistency
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase().trim())}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    );

    if (!response.ok) {
      console.error(`Error retrieving user: ${response.status} - ${response.statusText}`);
      return null;
    }

    const users = await response.json();

    // Return the first user if found, otherwise null
    if (Array.isArray(users) && users.length > 0) {
      return users[0] as UserData;
    }

    return null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
}
