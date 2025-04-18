import { supabase } from "@/lib/supabase";
import { FortnoxCredentials } from "./types";
import { refreshAccessToken } from "./auth";
import { toast } from "sonner";

/**
 * Save Fortnox credentials to the database
 * This function should only be callable by admins (enforced at the UI level)
 */
export async function saveFortnoxCredentials(credentials: FortnoxCredentials): Promise<void> {
  try {
    // Convert credentials to a plain object to ensure it can be stored in JSON
    const credentialsObj = { ...credentials };
    
    // Set a long expiration time for refresh tokens (350 days to be safe)
    if (credentials.refreshToken) {
      credentialsObj.refreshTokenExpiresAt = Date.now() + (350 * 24 * 60 * 60 * 1000);
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
    
    // If access token is expired or close to expiring (within 5 minutes), refresh it
    if (settingsData.accessToken && settingsData.expiresAt) {
      const expiresInMinutes = (settingsData.expiresAt - Date.now()) / (1000 * 60);
      const shouldRefresh = expiresInMinutes < 15; // Increased buffer to 15 minutes
      
      if (shouldRefresh) {
        console.log(`Access token ${expiresInMinutes < 0 ? 'expired' : 'expiring soon'}, attempting refresh`);
        
        try {
          if (!settingsData.refreshToken) {
            console.error("Cannot refresh: No refresh token available");
            return settingsData; // Return existing credentials
          }
          
          const refreshed = await refreshAccessToken(
            settingsData.clientId,
            settingsData.clientSecret,
            settingsData.refreshToken
          );
          
          // Update credentials with new tokens
          const updatedCredentials = {
            ...settingsData,
            ...refreshed,
          };
          
          // Save the refreshed credentials
          await saveFortnoxCredentials(updatedCredentials);
          
          console.log("Successfully refreshed and saved new access token");
          return updatedCredentials;
        } catch (refreshError) {
          console.error("Error refreshing access token:", refreshError);
          
          // If refresh fails but tokens aren't expired yet, return existing credentials
          if (expiresInMinutes > 0) {
            console.log("Using existing credentials as fallback");
            return settingsData;
          }
          
          // If tokens are actually expired, return null to trigger reconnect
          return null;
        }
      }
    }
    
    // Add detailed token type logging
    console.log("Token Details:", {
      hasClientId: !!settingsData.clientId,
      hasAccessToken: !!settingsData.accessToken,
      hasRefreshToken: !!settingsData.refreshToken,
      isLegacyToken: settingsData.isLegacyToken,
      isTokenExpired: settingsData.expiresAt ? Date.now() > settingsData.expiresAt : null
    });
    
    return settingsData;
  } catch (error) {
    console.error('Error getting Fortnox credentials:', error);
    return null;
  }
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
      
      // If token expires in less than 15 minutes or is already expired
      if (expiresInMinutes < 15) {
        console.log(`Fortnox token ${expiresInMinutes < 0 ? 'expired' : 'expiring soon'}, attempting to refresh`);
        
        // Token is expired or expiring soon, need to refresh
        if (!credentials.refreshToken) {
          console.log("No refresh token available");
          return false;
        }
        
        try {
          // Attempt to refresh the token
          const refreshed = await refreshAccessToken(
            credentials.clientId,
            credentials.clientSecret,
            credentials.refreshToken
          );
          
          // Save the refreshed tokens
          await saveFortnoxCredentials({
            ...credentials,
            ...refreshed,
          });
          
          console.log("Fortnox token refreshed successfully");
          return true;
        } catch (error) {
          console.error('Error refreshing token:', error);
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
