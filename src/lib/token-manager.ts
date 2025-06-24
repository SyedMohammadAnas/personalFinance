/**
 * OAuth Token Manager
 *
 * This module is responsible for storing and retrieving OAuth tokens for users.
 * It securely stores access tokens and refresh tokens in Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { OAuth2Client } from 'google-auth-library';

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Interface for token data
 */
interface TokenData {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
}

/**
 * Stores a user's OAuth tokens in Supabase
 */
export async function storeTokens(
  userId: string,
  tokenData: TokenData
): Promise<boolean> {
  try {
    // Validate inputs
    if (!userId || !tokenData.access_token) {
      console.error('Missing required token data');
      return false;
    }

    // Validate Supabase credentials
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not configured');
      return false;
    }

    console.log(`Attempting to store tokens for user ID: ${userId}`);

    // First, check if the user_tokens table exists
    try {
      // Create Supabase client for direct API access
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Try to ensure the table exists, but don't fail if the function doesn't exist
      try {
        await supabase.rpc('create_tokens_table_if_not_exists');
      } catch (error) {
        console.log('RPC create_tokens_table_if_not_exists not available, continuing...');
      }

      // Check if a record already exists for this user
      const { data: existingTokens, error: queryError } = await supabase
        .from('user_tokens')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (queryError) {
        console.error('Error checking for existing tokens:', queryError);
        // Continue with direct API approach
      }

      // Prepare token data
      const tokenRecord = {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expiry_date: tokenData.expiry_date || null,
        scope: tokenData.scope || null,
        updated_at: new Date().toISOString()
      };

      // If record exists, update it; otherwise, insert new record
      if (existingTokens && existingTokens.length > 0) {
        // Update existing record
        const { error } = await supabase
          .from('user_tokens')
          .update(tokenRecord)
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating token with Supabase client:', error);
          // Fall back to direct REST API approach
        } else {
          console.log('Successfully updated token with Supabase client');
          return true;
        }
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_tokens')
          .insert({
            ...tokenRecord,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error inserting token with Supabase client:', error);
          // Fall back to direct REST API approach
        } else {
          console.log('Successfully inserted token with Supabase client');
          return true;
        }
      }
    } catch (supabaseError) {
      console.error('Error with Supabase client, trying direct REST API:', supabaseError);
    }

    // Direct REST API approach as fallback
    console.log('Falling back to direct REST API approach');

    // Use direct REST API approach to avoid client library issues
    const checkExisting = await fetch(
      `${supabaseUrl}/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}&select=id`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    );

    const existingTokens = await checkExisting.json();
    const exists = Array.isArray(existingTokens) && existingTokens.length > 0;

    if (exists) {
      console.log('Existing token found, updating');
      // Update existing token
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expiry_date: tokenData.expiry_date || null,
            scope: tokenData.scope || null,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!updateResponse.ok) {
        console.error(`Error updating token: ${updateResponse.status} - ${await updateResponse.text()}`);
        return false;
      }

      console.log('Token updated successfully via REST API');
      return true;
    } else {
      console.log('No existing token, inserting new one');
      // Insert new token
      const insertResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            expiry_date: tokenData.expiry_date || null,
            scope: tokenData.scope || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!insertResponse.ok) {
        const errorText = await insertResponse.text();
        console.error(`Error inserting token: ${insertResponse.status} - ${errorText}`);

        if (errorText.includes('violates foreign key constraint')) {
          console.error('Foreign key constraint error - ensure the users table exists and contains this user_id');
        }

        return false;
      }

      console.log('Token inserted successfully via REST API');
      return true;
    }
  } catch (error) {
    console.error('Error storing tokens:', error);
    return false;
  }
}

/**
 * Retrieves a valid access token for a user
 * If the current token is expired, it will try to refresh it
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase credentials not configured');
      return null;
    }

    // Create Supabase client for direct API access
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get token data for user
    const { data: tokenData } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error('Error retrieving token data with Supabase client:', error);

      // Try direct REST API as fallback
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/user_tokens?user_id=eq.${encodeURIComponent(userId)}`,
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
          console.error(`Error retrieving token: ${response.status} - ${await response.text()}`);
          return null;
        }

        const tokens = await response.json();
        if (Array.isArray(tokens) && tokens.length > 0) {
          const userToken = tokens[0];

          // Check if token is expired
          const now = Date.now();
          const isExpired = userToken.expiry_date && userToken.expiry_date < now;

          if (!isExpired) {
            return userToken.access_token;
          }

          // Handle token refresh
          return await refreshToken(userId, userToken);
        }

        return null;
      } catch (restError) {
        console.error('Error with direct REST API call:', restError);
        return null;
      }
    }

    if (!tokenData || tokenData.length === 0) {
      console.log('No token data found for user:', userId);
      return null;
    }

    const userToken = tokenData[0];

    // Check if token is still valid
    const now = Date.now();
    const isExpired = userToken.expiry_date && userToken.expiry_date < now;

    if (!isExpired) {
      return userToken.access_token;
    }

    return await refreshToken(userId, userToken);
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

interface UserToken {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
}

/**
 * Helper function to refresh an expired token
 */
async function refreshToken(userId: string, userToken: UserToken): Promise<string | null> {
  // Token is expired, try to refresh it
  if (!userToken.refresh_token) {
    console.error('No refresh token available for user', userId);
    return null;
  }

  try {
    // Create OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: userToken.refresh_token
    });

    // Refresh token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Store new tokens
    const stored = await storeTokens(userId, {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || userToken.refresh_token,
      expiry_date: credentials.expiry_date || undefined,
      scope: credentials.scope
    });

    if (!stored) {
      console.error('Failed to store refreshed tokens');
    }

    return credentials.access_token!;
  } catch (refreshError) {
    console.error('Error refreshing token:', refreshError);
    return null;
  }
}
