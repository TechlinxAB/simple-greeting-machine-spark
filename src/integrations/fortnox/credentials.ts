
import { supabase } from "@/lib/supabase";
import { FortnoxCredentials, RefreshResult } from "./types";
import { refreshAccessToken } from "./auth";
import { toast } from "sonner";

// Constants for token refresh settings
const TOKEN_REFRESH_BUFFER_DAYS = 7; // Days before expiration to refresh
const MAX_REFRESH_FAILS = 3; // Maximum consecutive refresh failures before requiring reconnect
const REFRESH_RETRY_INTERVAL = 30 * 60 * 1000; // 30 minutes between retries

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
        console.log(`Fortnox token ${expiresInMinutes < 0 ? 'expired' : 'expiring soon'}, attempting to refresh`);
        
        // Token is expired or expiring soon, need to refresh
        if (!credentials.refreshToken) {
          console.log("No refresh token available");
          return false;
        }
        
        // Check if refresh has failed too many times recently
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
