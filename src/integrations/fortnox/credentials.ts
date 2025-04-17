
import { supabase } from "@/lib/supabase";
import { FortnoxCredentials } from "./types";

/**
 * Save Fortnox credentials to the database
 * This function should only be callable by admins (enforced at the UI level)
 */
export async function saveFortnoxCredentials(credentials: FortnoxCredentials): Promise<void> {
  try {
    // Convert credentials to a plain object to ensure it can be stored in JSON
    const credentialsObj = { ...credentials };
    
    console.log("Saving Fortnox credentials to database");
    
    // Use upsert with type safety
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: credentialsObj
      }, {
        // Specify the unique key
        onConflict: 'id'
      })
      .select();
      
    if (error) {
      console.error("Error saving Fortnox credentials:", error);
      throw error;
    }
    
    console.log("Fortnox credentials saved successfully:", data ? "Data returned" : "No data returned");
  } catch (error) {
    console.error('Error saving Fortnox credentials:', error);
    throw error;
  }
}

/**
 * Get stored Fortnox credentials
 * This function is accessible to both admins and managers
 */
export async function getFortnoxCredentials(): Promise<FortnoxCredentials | null> {
  try {
    console.log("Fetching Fortnox credentials from database");
    
    // Direct query to get system settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
      
    if (error) {
      // Enhanced error logging for debugging permission issues
      if (error.code === 'PGRST116' || error.code === '42501') {
        console.error('Permission error fetching Fortnox credentials:', error);
        console.log('User may not have proper permissions to read system_settings');
      } else {
        console.error('Error fetching Fortnox credentials:', error);
      }
      return null;
    }
    
    if (!data || !data.settings) {
      console.log("No Fortnox credentials found in database");
      return null;
    }
    
    // Handle the data properly with type checking
    const settingsData = data.settings;
    
    console.log("Fortnox credentials retrieved successfully, data type:", typeof settingsData);
    
    // Proper type checking before casting to FortnoxCredentials
    if (
      typeof settingsData === 'object' && 
      settingsData !== null && 
      !Array.isArray(settingsData) &&
      'clientId' in settingsData && 
      typeof settingsData.clientId === 'string' &&
      'clientSecret' in settingsData &&
      typeof settingsData.clientSecret === 'string'
    ) {
      // After thorough type checking, we can safely cast
      const result = {
        clientId: settingsData.clientId,
        clientSecret: settingsData.clientSecret,
        accessToken: typeof settingsData.accessToken === 'string' ? settingsData.accessToken : undefined,
        refreshToken: typeof settingsData.refreshToken === 'string' ? settingsData.refreshToken : undefined,
        expiresAt: typeof settingsData.expiresAt === 'number' ? settingsData.expiresAt : undefined
      };
      
      console.log("Successfully parsed Fortnox credentials:", {
        clientIdLength: result.clientId ? result.clientId.length : 0,
        clientSecretLength: result.clientSecret ? result.clientSecret.length : 0,
        hasAccessToken: !!result.accessToken,
        hasRefreshToken: !!result.refreshToken,
        hasExpiresAt: !!result.expiresAt
      });
      
      return result;
    }
    
    console.log("Invalid credentials format found in settings:", settingsData);
    return null;
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
    
    // Check if token is expired
    if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
      console.log("Fortnox token expired, attempting to refresh");
      
      // Token is expired, need to refresh
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

// Import from auth.ts to avoid circular dependencies
import { refreshAccessToken } from "./auth";
