import { SystemSettings, FortnoxCredentials, RefreshResult, TokenRefreshLog } from './types';
import { supabase } from '@/lib/supabase';
import { isLegacyToken } from './credentials';

const FORTNOX_TOKEN_URL = 'https://api.fortnox.se/3/oauth-v2/token';

/**
 * Exchanges an authorization code for access and refresh tokens from Fortnox.
 * @param code The authorization code received from Fortnox.
 * @param clientId The client ID of the Fortnox application.
 * @param clientSecret The client secret of the Fortnox application.
 * @param redirectUri The redirect URI used in the authorization request.
 * @returns A promise that resolves to an object containing the access token, refresh token, and expires_in value, or rejects with an error.
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  try {
    console.log("Exchanging authorization code for tokens via Edge Function");
    
    // Use the edge function to exchange the code for tokens
    const { data, error } = await supabase.functions.invoke('fortnox-token-exchange', {
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (error) {
      console.error('Error calling token exchange edge function:', error);
      throw new Error(`Token exchange failed: ${error.message}`);
    }

    if (!data || !data.access_token || !data.refresh_token || !data.expires_in) {
      console.error('Incomplete token data received:', data);
      throw new Error('Incomplete token data received from Fortnox');
    }

    console.log("Successfully received tokens via Edge Function:", {
      accessTokenLength: data.access_token.length,
      refreshTokenLength: data.refresh_token.length,
      expiresIn: data.expires_in
    });

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
 * @param clientId The client ID of the Fortnox application.
 * @param clientSecret The client secret of the Fortnox application.
 * @param redirectUri The redirect URI used in the authorization request.
 * @returns A promise that resolves to an object containing the new access token, refresh token, and expires_in value, or rejects with an error.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
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
          message: 'Refresh token is invalid or expired',
          requiresReconnect: true,
          error: `Refresh token is invalid or expired: ${response.status} ${response.statusText} - ${errorBody}` 
        };
      }
      
      return { 
        success: false, 
        message: 'Failed to refresh access token',
        requiresReconnect: false,
        error: `Failed to refresh access token: ${response.status} ${response.statusText} - ${errorBody}` 
      };
    }

    const data = await response.json();

    if (!data.access_token || !data.refresh_token || !data.expires_in) {
      console.error('Incomplete token data received during refresh:', data);
      return { 
        success: false, 
        message: 'Incomplete token data received from Fortnox',
        requiresReconnect: false,
        error: 'Incomplete token data received from Fortnox during refresh' 
      };
    }
    
    return {
      success: true,
      message: 'Token refreshed successfully',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      requiresReconnect: false
    };
  } catch (error: any) {
    console.error('Error in refreshAccessToken:', error);
    return { 
      success: false,
      message: `Token refresh failed: ${error.message}`,
      requiresReconnect: false,
      error: `Token refresh failed: ${error.message}` 
    };
  }
}

/**
 * Triggers a system token refresh by calling an edge function.
 * @returns A promise that resolves to void.
 */
export async function triggerSystemTokenRefresh(force: boolean = false): Promise<boolean> {
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
    return true;
  } catch (error: any) {
    console.error("Error in triggerSystemTokenRefresh:", error);
    return false;
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

    return data as SystemSettings || null;
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
      .upsert(settings, { onConflict: 'id' });

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

    if (isLegacyToken(credentials)) {
      console.warn("Legacy token detected. Cannot validate legacy tokens.");
      return false;
    }

    const refreshResult = await refreshAccessToken(
      credentials.refreshToken,
      credentials.clientId,
      credentials.clientSecret,
      redirectUri
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
