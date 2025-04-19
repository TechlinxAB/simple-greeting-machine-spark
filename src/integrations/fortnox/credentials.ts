
import { supabase } from "@/lib/supabase";
import { FortnoxCredentials } from "./types";
import { triggerSystemTokenRefresh } from "./auth";
import { toast } from "sonner";

/**
 * Save Fortnox credentials to the database
 * This function should only be callable by admins (enforced at the UI level)
 */
export async function saveFortnoxCredentials(credentials: FortnoxCredentials): Promise<void> {
  try {
    // Convert credentials to a plain object to ensure it can be stored in JSON
    const credentialsObj = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken
    };
    
    console.log("Saving Fortnox credentials to database");
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: credentialsObj as Record<string, any>
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
 * Get stored Fortnox credentials
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
    
    // Add detailed token type logging
    console.group("🔍 Token Type Analysis");
    console.log("Access Token Present:", !!settingsData.accessToken);
    console.log("Refresh Token Present:", !!settingsData.refreshToken);
    console.groupEnd();
    
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
 * Check if Fortnox integration is connected and has valid credentials
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
    
    console.log("Fortnox connected with access token");
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
 */
export async function forceTokenRefresh(): Promise<boolean> {
  try {
    console.log("Forcing token refresh");
    
    // Call the system-level refresh with force flag
    const success = await triggerSystemTokenRefresh(true);
    
    if (success) {
      console.log("Token refresh triggered successfully");
      return true;
    } else {
      console.error("Failed to trigger token refresh");
      return false;
    }
  } catch (error) {
    console.error("Error during forced token refresh:", error);
    return false;
  }
}
