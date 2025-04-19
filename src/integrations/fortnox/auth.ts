import { SystemSettings, FortnoxCredentials, RefreshResult } from './types';
import { supabase } from '@/lib/supabase';
import { isLegacyToken } from './credentials';

const FORTNOX_TOKEN_URL = 'https://api.fortnox.se/3/oauth-v2/token';

/**
 * Exchanges an authorization code for access and refresh tokens from Fortnox.
 * @param code The authorization code received from Fortnox.
 * @param redirectUri The redirect URI used in the authorization request.
 * @param clientId The client ID of the Fortnox application.
 * @param clientSecret The client secret of the Fortnox application.
 * @returns A promise that resolves to an object containing the access token, refresh token, and expires_in value, or rejects with an error.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const authString = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error exchanging code for tokens:', response.status, response.statusText, errorBody);
      throw new Error(`Failed to exchange code for tokens: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();

    if (!data.access_token || !data.refresh_token || !data.expires_in) {
      console.error('Incomplete token data received:', data);
      throw new Error('Incomplete token data received from Fortnox');
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error: any) {
    console.error('Error in exchangeCodeForTokens:', error);
    throw new Error(`Token exchange failed: ${error.message}`);
  }
}

/**
 * Refreshes an access token using a refresh token from Fortnox.
 * @param refreshToken The refresh token to use.
 * @param redirectUri The redirect URI used in the authorization request.
 * @param clientId The client ID of the Fortnox application.
 * @param clientSecret The client secret of the Fortnox application.
 * @returns A promise that resolves to an object containing the new access token, refresh token, and expires_in value, or rejects with an error.
 */
export async function refreshAccessToken(
  refreshToken: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string
): Promise<RefreshResult> {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('redirect_uri', redirectUri);

    const authString = btoa(`${clientId}:${clientSecret}`);

    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error refreshing access token:', response.status, response.statusText, errorBody);
      
      // Check if the error is due to an invalid grant (e.g., refresh token expired or revoked)
      if (errorBody.includes('invalid_grant')) {
        return { 
          success: false, 
          requiresReconnect: true,
          error: `Refresh token is invalid or expired: ${response.status} ${response.statusText} - ${errorBody}` 
        };
      }
      
      return { 
        success: false, 
        requiresReconnect: false,
        error: `Failed to refresh access token: ${response.status} ${response.statusText} - ${errorBody}` 
      };
    }

    const data = await response.json();

    if (!data.access_token || !data.refresh_token || !data.expires_in) {
      console.error('Incomplete token data received during refresh:', data);
      return { 
        success: false, 
        requiresReconnect: false,
        error: 'Incomplete token data received from Fortnox during refresh' 
      };
    }
    
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      requiresReconnect: false
    };
  } catch (error: any) {
    console.error('Error in refreshAccessToken:', error);
    return { 
      success: false, 
      requiresReconnect: false,
      error: `Token refresh failed: ${error.message}` 
    };
  }
}

/**
 * Triggers a system token refresh by calling an edge function.
 * @returns A promise that resolves to void.
 */
export async function triggerSystemTokenRefresh(force: boolean = false): Promise<void> {
  try {
    console.log("Attempting to trigger system token refresh via Edge Function");
    
    const { data, error } = await supabase.functions.invoke('fortnox-scheduled-refresh', {
      body: JSON.stringify({ force }),
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (error) {
      console.error("Error invoking Edge Function for token refresh:", error);
      throw new Error(`Failed to trigger token refresh: ${error.message}`);
    }

    console.log("Edge Function invoked successfully:", data);
  } catch (error: any) {
    console.error("Error in triggerSystemTokenRefresh:", error);
    throw new Error(`Failed to trigger token refresh: ${error.message}`);
  }
}

/**
 * Fetches the system settings from the database.
 * @returns A promise that resolves to the system settings, or null if not found.
 */
export async function getSystemSettings(): Promise<SystemSettings | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error) {
      console.error("Error fetching system settings:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Failed to fetch system settings:", error);
    return null;
  }
}

/**
 * Updates the system settings in the database.
 * @param settings The settings to update.
 * @returns A promise that resolves to void.
 */
export async function updateSystemSettings(settings: SystemSettings): Promise<void> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert(settings, { onConflict: 'key' });

    if (error) {
      console.error("Error updating system settings:", error);
      throw new Error(`Failed to update system settings: ${error.message}`);
    }

    console.log("System settings updated successfully.");
  } catch (error: any) {
    console.error("Failed to update system settings:", error);
    throw new Error(`Failed to update system settings: ${error.message}`);
  }
}

/**
 * Validates the Fortnox credentials by attempting to refresh the token.
 * @param credentials The credentials to validate.
 * @param redirectUri The redirect URI used in the authorization request.
 * @returns A promise that resolves to true if the credentials are valid, or false otherwise.
 */
export async function validateFortnoxCredentials(
  credentials: FortnoxCredentials,
  redirectUri: string
): Promise<boolean> {
  try {
    if (!credentials.refreshToken || !credentials.clientId || !credentials.clientSecret) {
      console.warn("Missing refreshToken, clientId, or clientSecret. Cannot validate credentials.");
      return false;
    }

    if (isLegacyToken(credentials.refreshToken)) {
      console.warn("Legacy token detected. Cannot validate legacy tokens.");
      return false;
    }

    const refreshResult = await refreshAccessToken(
      credentials.refreshToken,
      redirectUri,
      credentials.clientId,
      credentials.clientSecret
    );

    if (!refreshResult.success) {
      console.error("Failed to refresh token during validation:", refreshResult.error);
      return false;
    }

    console.log("Fortnox credentials validated successfully.");
    return true;
  } catch (error) {
    console.error("Error validating Fortnox credentials:", error);
    return false;
  }
}

// Token refresh history log entry
export interface TokenRefreshLog {
  id: string;
  success: boolean;
  message?: string;
  token_length?: number;
  session_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches the token refresh history from the database
 * @param limit Maximum number of records to return
 * @returns Array of token refresh log entries
 */
export async function getTokenRefreshHistory(limit: number = 10): Promise<TokenRefreshLog[]> {
  try {
    const { data, error } = await supabase
      .from('token_refresh_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching token refresh history:", error);
      return [];
    }
    
    return data as TokenRefreshLog[];
  } catch (error) {
    console.error("Failed to fetch token refresh history:", error);
    return [];
  }
}
