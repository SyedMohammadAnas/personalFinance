/**
 * OAuth Token Manager
 *
 * This module is responsible for storing and retrieving OAuth tokens for users.
 * It securely stores access tokens and refresh tokens in Supabase.
 */

import { getSupabaseClient } from './supabase';
import { OAuth2Client } from 'google-auth-library';

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

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Check if token record already exists for this user
    const { data: existingTokens, error: queryError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (queryError) {
      console.error('Error checking for existing tokens:', queryError);
      return false;
    }

    // Prepare token data object
    const tokenRecord = {
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expiry_date: tokenData.expiry_date || null,
      scope: tokenData.scope || null,
      updated_at: new Date()
    };

    // Either update existing record or insert new one
    if (existingTokens && existingTokens.length > 0) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_tokens')
        .update(tokenRecord)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating token record:', updateError);
        return false;
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('user_tokens')
        .insert({
          ...tokenRecord,
          created_at: new Date()
        });

      if (insertError) {
        console.error('Error inserting token record:', insertError);
        return false;
      }
    }

    return true;
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
    // Get Supabase client
    const supabase = getSupabaseClient();

    // Get token data for user
    const { data: tokenData, error } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (error || !tokenData || tokenData.length === 0) {
      console.error('Error retrieving token data:', error);
      return null;
    }

    const userToken = tokenData[0];

    // Check if token is still valid
    const now = Date.now();
    const isExpired = userToken.expiry_date && userToken.expiry_date < now;

    if (!isExpired) {
      return userToken.access_token;
    }

    // Token is expired, try to refresh it
    if (!userToken.refresh_token) {
      console.error('No refresh token available for user', userId);
      return null;
    }

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
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Store new tokens
      await storeTokens(userId, {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token || userToken.refresh_token,
        expiry_date: credentials.expiry_date,
        scope: credentials.scope
      });

      return credentials.access_token!;
    } catch (refreshError) {
      console.error('Error refreshing token:', refreshError);
      return null;
    }
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}
