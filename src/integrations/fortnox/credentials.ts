import { supabase } from "@/lib/supabase";
import { FortnoxCredentials, RefreshResult } from "./types";
import { refreshAccessToken, triggerSystemTokenRefresh } from "./auth";
import { toast } from "sonner";

// Constants for token refresh settings
const TOKEN_REFRESH_BUFFER_DAYS = 7; // Days before expiration to refresh
const MAX_REFRESH_FAILS = 3; // Maximum consecutive refresh failures before requiring reconnect
const REFRESH_RETRY_INTERVAL = 30 * 60 * 1000; // 30 minutes between retries

// Keep track of background refresh attempts
let isBackgroundRefreshInProgress = false;
let lastBackgroundRefreshAttempt = 0;
const BACKGROUND_REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

/**
 * Save Fortnox credentials to the database
 * This function should only be callable by admins (enforced at the UI level)
 */
export async function saveFortnoxCredentials(credentials: FortnoxCredentials): Promise<void> {
  try {
    // Convert credentials to a plain object to ensure it can be stored in JSON
    const credentialsObj = { ...credentials };
    
    // Set a long expiration time for refresh tokens (45 days from now)
    if (credentials.refreshToken && !credentials.refreshTokenExpiresAt) {
      credentialsObj.refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000);
    }
    
    console.log("Saving Fortnox credentials to database");
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: credentialsObj
      }, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error("Error saving Fortnox credentials:", error);
      throw error;
    }
    
    console.log("Fortnox credentials saved successfully");
  } catch (error) {
    console.error('Error saving Fortnox credentials:', error);
    throw error;
  }
}

/**
 * Try to initiate a background system-level token refresh
 * This is a non-blocking operation that doesn't rely on user auth
 */
async function tryBackgroundTokenRefresh(): Promise<void> {
  // Don't attempt if another refresh is already in progress or if we've tried recently
  const now = Date.now();
  if (isBackgroundRefreshInProgress || (now - lastBackgroundRefreshAttempt < BACKGROUND_REFRESH_COOLDOWN)) {
    console.log("Skipping background refresh - another refresh is in progress or cooldown active");
    return;
  }
  
  try {
    console.log("Initiating background token refresh");
    isBackgroundRefreshInProgress = true;
    lastBackgroundRefreshAttempt = now;
    
    // This calls the system-level edge function that can refresh the token
    const success = await triggerSystemTokenRefresh();
    
    console.log("Background token refresh completed:", success ? "success" : "failed");
    
    // No need to update local state - the next getFortnoxCredentials call will
    // pull the latest credentials from the database
  } catch (error) {
    console.error("Background token refresh error:", error);
  } finally {
    isBackgroundRefreshInProgress = false;
  }
}

/**
 * Get stored Fortnox credentials with automatic refresh if needed
 */
export async function getFortnoxCredentials(): Promise<FortnoxCredentials | null> {
  try {
    console.log("Fetching Fortnox credentials from database");
    
    // Add retry mechanism for database connectivity issues
    let retries = 3;
    let data = null;
    let error = null;
    
    while (retries > 0 && data === null) {
      const result = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'fortnox_credentials')
        .maybeSingle();
      
      data = result.data;
      error = result.error;
      
      if (error) {
        console.error(`Error fetching Fortnox credentials (${4-retries}/3):`, error);
        retries--;
        if (retries > 0) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        break;
      }
    }
    
    if (error) {
      console.error('Error fetching Fortnox credentials after retries:', error);
      return null;
    }
    
    if (!data || !data.settings) {
      console.log("No Fortnox credentials found in database");
      return null;
    }
    
    // Fix for TypeScript error - properly type-cast the JSON data to FortnoxCredentials
    // First cast to unknown, then to FortnoxCredentials to avoid type errors
    const settingsData = data.settings as unknown as FortnoxCredentials;
    
    // Validate credentials structure
    if (!settingsData.clientId || !settingsData.clientSecret) {
      console.log("Invalid credentials format - missing client ID or secret");
      return null;
    }
    
    // If we have a refresh token, check its expiration
    if (settingsData.refreshToken && settingsData.refreshTokenExpiresAt) {
      const refreshTokenExpired = Date.now() > settingsData.refreshTokenExpiresAt;
      
      if (refreshTokenExpired) {
        console.log("Refresh token has expired - user needs to reconnect");
        toast.error("Fortnox connection has expired. Please reconnect.");
        return settingsData; // Return credentials so UI can show reconnect state
      }
    }
    
    // Check if refresh has failed too many times
    const refreshFailCount = settingsData.refreshFailCount || 0;
    const lastRefreshAttempt = settingsData.lastRefreshAttempt || 0;
    const timeSinceLastRefresh = Date.now() - lastRefreshAttempt;
    
    if (refreshFailCount >= MAX_REFRESH_FAILS && timeSinceLastRefresh < REFRESH_RETRY_INTERVAL) {
      console.log(`Refresh has failed ${refreshFailCount} times, waiting before retrying`);
      return settingsData; // Return existing credentials without attempting refresh
    }
    
    // If access token is expired or close to expiring (within TOKEN_REFRESH_BUFFER_DAYS days), refresh it
    if (settingsData.accessToken && settingsData.expiresAt) {
      const expiresInMinutes = (settingsData.expiresAt - Date.now()) / (1000 * 60);
      const expiresInDays = expiresInMinutes / (60 * 24);
      const shouldRefresh = expiresInDays < TOKEN_REFRESH_BUFFER_DAYS || expiresInMinutes < 30;
      
      if (shouldRefresh) {
        console.log(`Access token ${expiresInMinutes < 0 ? 'expired' : 'expiring soon'}, attempting refresh`);
        
        // Try using a background refresh first (non-blocking, system level)
        // This won't immediately update our local credentials but will update the database
        tryBackgroundTokenRefresh();
        
        // If the tokens aren't actually expired yet, we can still use them while the background refresh happens
        if (expiresInMinutes > 0) {
          console.log("Using existing credentials while background refresh happens");
          return settingsData;
        }
        
        // If tokens are truly expired, we need to try a direct refresh and wait for the result
        try {
          if (!settingsData.refreshToken) {
            console.error("Cannot refresh: No refresh token available");
            return settingsData; // Return existing credentials
          }
          
          const refreshResult: RefreshResult = await refreshAccessToken(
            settingsData.clientId,
            settingsData.clientSecret,
            settingsData.refreshToken
          );
          
          if (!refreshResult.success) {
            console.error("Error refreshing access token:", refreshResult.message);
            
            // Update the failure counter
            const updatedCredentials = {
              ...settingsData,
              refreshFailCount: (settingsData.refreshFailCount || 0) + 1,
              lastRefreshAttempt: Date.now()
            };
            
            // Save the updated failure counter
            await saveFortnoxCredentials(updatedCredentials);
            
            // If this was a permanent failure that requires reconnection
            if (refreshResult.requiresReconnect) {
              console.log("Refresh token is invalid, user needs to reconnect");
              toast.error("Fortnox connection needs to be reestablished", {
                description: "Please reconnect to Fortnox."
              });
              return updatedCredentials; // Return so UI can show reconnect state
            }
            
            // If tokens aren't expired yet, return existing credentials
            if (expiresInMinutes > 0) {
              console.log("Using existing credentials as fallback");
              return settingsData;
            }
            
            // If tokens are actually expired, return with failure counter
            return updatedCredentials;
          }
          
          // Success! Update credentials with new tokens
          const updatedCredentials = {
            ...settingsData,
            ...refreshResult.credentials
          };
          
          // Save the refreshed credentials
          await saveFortnoxCredentials(updatedCredentials);
          
          console.log("Successfully refreshed and saved new access token");
          return updatedCredentials;
        } catch (refreshError) {
          console.error("Error refreshing access token:", refreshError);
          
          // Update the failure counter
          const updatedCredentials = {
            ...settingsData,
            refreshFailCount: (settingsData.refreshFailCount || 0) + 1,
            lastRefreshAttempt: Date.now()
          };
          
          // Save the updated failure counter
          await saveFortnoxCredentials(updatedCredentials);
          
          // If tokens aren't expired yet, return existing credentials
          if (expiresInMinutes > 0) {
            console.log("Using existing credentials as fallback");
            return settingsData;
          }
          
          // If tokens are actually expired, return null to trigger reconnect
          return updatedCredentials;
        }
      }
    }
    
    // Add detailed token type logging
    console.log("Token Details Extended:", {
      hasClientId: !!settingsData.clientId,
      hasAccessToken: !!settingsData.accessToken,
      hasRefreshToken: !!settingsData.refreshToken,
      isLegacyToken: isLegacyToken(settingsData),
      isTokenExpired: settingsData.expiresAt ? Date.now() > settingsData.expiresAt : null,
      expiresInMinutes: settingsData.expiresAt ? Math.round((settingsData.expiresAt - Date.now()) / (1000 * 60)) : null,
      refreshFailCount: settingsData.refreshFailCount || 0
    });
    
    return settingsData;
  } catch (error) {
    console.error('Error getting Fortnox credentials:', error);
    return null;
  }
}

export function isLegacyToken(credentials: FortnoxCredentials | null): boolean {
  if (!credentials || !credentials.accessToken) {
    console.log("🚨 Token Check: No credentials or access token");
    return false;
  }
  
  // Detailed token type logging
  console.group("🔍 Token Type Analysis");
  console.log("Access Token Present:", !!credentials.accessToken);
  console.log("Refresh Token Present:", !!credentials.refreshToken);
  console.log("Explicitly Marked Legacy Token:", credentials.isLegacyToken);
  
  // If explicitly marked as legacy token
  if (credentials.isLegacyToken === true) {
    console.log("✅ Token Type: LEGACY (Explicitly Marked)");
    console.groupEnd();
    return true;
  }
  
  // If we have an access token but no refresh token, it's likely a legacy token
  if (credentials.accessToken && !credentials.refreshToken) {
    console.log("⚠️ Token Type: LEGACY (No Refresh Token)");
    console.groupEnd();
    return true;
  }
  
  console.log("✅ Token Type: JWT (Modern OAuth Token)");
  console.groupEnd();
  return false;
}

/**
 * Check if Fortnox integration is connected and tokens are valid
 * This function is now role-independent, allowing any user to check if Fortnox is connected
 */
export async function isFortnoxConnected(): Promise<boolean> {
  try {
    console.log("Checking Fortnox connection status");
    const credentials = await getFortnoxCredentials();
    
    if (!credentials) {
      console.log("Fortnox not connected: No credentials found");
      return false;
    }
    
    if (!credentials.accessToken) {
      console.log("Fortnox not connected: No access token");
      return false;
    }
    
    // Check if token is expired or close to expiring
    if (credentials.expiresAt) {
      const expiresInMinutes = (credentials.expiresAt - Date.now()) / (1000 * 60);
      
      // If token expires in less than 30 minutes or is already expired
      if (expiresInMinutes < 30) {
        console.log(`Fortnox token ${expiresInMinutes < 0 ? 'expired' : 'expiring soon'}`);
        
        // Try a background refresh first
        tryBackgroundTokenRefresh();
        
        // If the token is not actually expired yet, we can still use it
        if (expiresInMinutes > 0) {
          console.log("Using existing token while refresh happens in background");
          return true;
        }
        
        // Token is expired, need to check if refresh failed too many times
        const refreshFailCount = credentials.refreshFailCount || 0;
        if (refreshFailCount >= MAX_REFRESH_FAILS) {
          const lastAttempt = credentials.lastRefreshAttempt || 0;
          const timeSinceLastAttempt = Date.now() - lastAttempt;
          
          if (timeSinceLastAttempt < REFRESH_RETRY_INTERVAL) {
            console.log(`Too many refresh failures (${refreshFailCount}), not attempting refresh yet`);
            return false;
          }
          
          console.log("Retry period has passed, attempting refresh despite previous failures");
        }
        
        // Try to refresh the token synchronously if expired
        if (!credentials.refreshToken) {
          console.log("No refresh token available");
          return false;
        }
        
        try {
          // Attempt to refresh the token
          const refreshResult = await refreshAccessToken(
            credentials.clientId,
            credentials.clientSecret,
            credentials.refreshToken
          );
          
          if (!refreshResult.success) {
            console.error('Error refreshing token:', refreshResult.message);
            
            // Update failure counter
            await saveFortnoxCredentials({
              ...credentials,
              refreshFailCount: (credentials.refreshFailCount || 0) + 1,
              lastRefreshAttempt: Date.now()
            });
            
            return false;
          }
          
          // Save the refreshed tokens
          await saveFortnoxCredentials({
            ...credentials,
            ...refreshResult.credentials
          });
          
          console.log("Fortnox token refreshed successfully");
          return true;
        } catch (error) {
          console.error('Error refreshing token:', error);
          
          // Update failure counter
          await saveFortnoxCredentials({
            ...credentials,
            refreshFailCount: (credentials.refreshFailCount || 0) + 1,
            lastRefreshAttempt: Date.now()
          });
          
          return false;
        }
      }
    }
    
    console.log("Fortnox connected with valid token");
    return true;
  } catch (error) {
    console.error("Error checking Fortnox connection:", error);
    return false;
  }
}

/**
 * Disconnect Fortnox integration
 * This function should only be callable by admins (enforced at the UI level)
 */
export async function disconnectFortnox(): Promise<void> {
  try {
    console.log("Disconnecting Fortnox integration");
    
    // Direct query to delete the system settings
    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('id', 'fortnox_credentials');
      
    if (error) throw error;
    
    console.log("Fortnox disconnected successfully");
  } catch (error) {
    console.error('Error disconnecting Fortnox:', error);
    throw error;
  }
}

/**
 * Function to manually force a token refresh
 * This is useful for UI components that need to ensure tokens are fresh
 */
export async function forceTokenRefresh(): Promise<boolean> {
  try {
    console.log("Forcing token refresh");
    
    // Try system-level refresh first (non-blocking)
    const systemRefreshStarted = await triggerSystemTokenRefresh(true);
    
    // If system refresh started successfully, return early
    if (systemRefreshStarted) {
      console.log("System-level token refresh started");
      return true;
    }
    
    // Fall back to manual refresh if system refresh fails
    console.log("Falling back to manual refresh");
    const credentials = await getFortnoxCredentials();
    
    if (!credentials || !credentials.refreshToken) {
      console.log("No valid credentials for manual refresh");
      return false;
    }
    
    const refreshResult = await refreshAccessToken(
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken
    );
    
    if (!refreshResult.success) {
      console.error("Manual refresh failed:", refreshResult.message);
      return false;
    }
    
    // Save the refreshed tokens
    await saveFortnoxCredentials({
      ...credentials,
      ...refreshResult.credentials
    });
    
    console.log("Manual token refresh completed successfully");
    return true;
  } catch (error) {
    console.error("Error during forced token refresh:", error);
    return false;
  }
}
