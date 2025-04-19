
import { supabase } from "@/lib/supabase";
import { FortnoxCredentials } from "./types";
import { triggerSystemTokenRefresh } from "./auth";
import { toast } from "sonner";

/**
 * Save Fortnox credentials to the database
 * This function should only be callable by admins (enforced at the UI level)
 */
export async function saveFortnoxCredentials(credentials: Partial<FortnoxCredentials>): Promise<void> {
  try {
    // Ensure all credentials are strings and we're not passing any unexpected fields
    const credentialsObj: Record<string, any> = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
    };
    
    // Only add these fields if they exist
    if (credentials.accessToken) {
      credentialsObj.accessToken = credentials.accessToken;
      console.log("🔑 Saving access token, length:", credentials.accessToken.length);
      console.log("🔑 Access token preview:", 
        `${credentials.accessToken.substring(0, 20)}...${credentials.accessToken.substring(credentials.accessToken.length - 20)}`);
    }
    
    if (credentials.refreshToken) {
      credentialsObj.refreshToken = credentials.refreshToken;
      console.log("🔑 Saving refresh token, length:", credentials.refreshToken.length);
      console.log("🔑 Refresh token preview:", 
        `${credentials.refreshToken.substring(0, 10)}...${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}`);
    }
    
    if (credentials.isLegacyToken !== undefined) {
      credentialsObj.isLegacyToken = credentials.isLegacyToken;
    }
    
    console.log("💾 Saving Fortnox credentials to database");
    
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: credentialsObj
      }, {
        onConflict: 'id'
      });
      
    if (error) {
      console.error("❌ Error saving Fortnox credentials:", error);
      throw error;
    }
    
    // Verify the saved credentials
    const { data: verifyData, error: verifyError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (verifyError) {
      console.error("❌ Error verifying saved credentials:", verifyError);
    } else if (verifyData && verifyData.settings) {
      // Type assertion for the JSON data
      const settings = verifyData.settings as Record<string, any>;
      
      console.log("✅ Verification - Saved credentials:", {
        clientIdMatch: settings.clientId === credentials.clientId,
        clientSecretLength: settings.clientSecret?.length,
        accessTokenLength: settings.accessToken?.length,
        refreshTokenLength: settings.refreshToken?.length
      });
      
      // Check if tokens match what we tried to save
      if (credentials.accessToken && settings.accessToken !== credentials.accessToken) {
        console.error("❌ Access token mismatch after save!");
      }
      
      if (credentials.refreshToken && settings.refreshToken !== credentials.refreshToken) {
        console.error("❌ Refresh token mismatch after save!");
      }
    }
    
    console.log("✅ Fortnox credentials saved successfully");
  } catch (error) {
    console.error('❌ Error saving Fortnox credentials:', error);
    throw error;
  }
}

/**
 * Get stored Fortnox credentials
 */
export async function getFortnoxCredentials(): Promise<FortnoxCredentials | null> {
  try {
    console.log("📚 Fetching Fortnox credentials from database");
    
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
        console.error(`❌ Error fetching Fortnox credentials (${4-retries}/3):`, error);
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
      console.error('❌ Error fetching Fortnox credentials after retries:', error);
      return null;
    }
    
    if (!data || !data.settings) {
      console.log("ℹ️ No Fortnox credentials found in database");
      return null;
    }
    
    // Properly type-cast the JSON data to FortnoxCredentials
    const settingsData = data.settings as Record<string, any>;
    
    // Construct a properly formatted FortnoxCredentials object
    const credentials: FortnoxCredentials = {
      clientId: settingsData.clientId,
      clientSecret: settingsData.clientSecret,
      accessToken: settingsData.accessToken,
      refreshToken: settingsData.refreshToken,
      isLegacyToken: settingsData.isLegacyToken
    };
    
    // Validate credentials structure
    if (!credentials.clientId || !credentials.clientSecret) {
      console.log("❌ Invalid credentials format - missing client ID or secret");
      return null;
    }
    
    // Debug access token integrity
    if (credentials.accessToken) {
      console.log(`📝 Access token retrieved from DB - Length: ${credentials.accessToken.length}`);
      console.log(`📝 Access token preview: ${credentials.accessToken.substring(0, 20)}...${credentials.accessToken.substring(credentials.accessToken.length - 20)}`);
      
      // Check if the token appears truncated (contains literal "...")
      if (credentials.accessToken.includes('...') && 
          !credentials.accessToken.startsWith('...') && 
          !credentials.accessToken.endsWith('...')) {
        console.error("⚠️ Access token appears to be truncated in the database");
      }
    }
    
    // Debug refresh token integrity
    if (credentials.refreshToken) {
      console.log(`📝 Refresh token retrieved from DB - Length: ${credentials.refreshToken.length}`);
      console.log(`📝 Refresh token preview: ${credentials.refreshToken.substring(0, 10)}...${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}`);
      
      // Check if the refresh token appears truncated
      if (credentials.refreshToken.includes('...') && 
          !credentials.refreshToken.startsWith('...') && 
          !credentials.refreshToken.endsWith('...')) {
        console.error("⚠️ Refresh token appears to be truncated in the database");
      }
    }
    
    // Add detailed token type logging
    console.log("🔍 Token Type Analysis");
    console.log("Access Token Present:", !!credentials.accessToken);
    console.log("Refresh Token Present:", !!credentials.refreshToken);
    console.log("Explicitly Marked Legacy Token:", credentials.isLegacyToken);
    
    return credentials;
  } catch (error) {
    console.error('❌ Error getting Fortnox credentials:', error);
    return null;
  }
}

export function isLegacyToken(credentials: FortnoxCredentials | null): boolean {
  if (!credentials || !credentials.accessToken) {
    console.log("🚨 Token Check: No credentials or access token");
    return false;
  }
  
  // Detailed token type logging
  console.log("🔍 Token Type Analysis");
  console.log("Access Token Present:", !!credentials.accessToken);
  console.log("Refresh Token Present:", !!credentials.refreshToken);
  console.log("Explicitly Marked Legacy Token:", credentials.isLegacyToken);
  
  // If explicitly marked as legacy token
  if (credentials.isLegacyToken === true) {
    console.log("✅ Token Type: LEGACY (Explicitly Marked)");
    return true;
  }
  
  // If we have an access token but no refresh token, it's likely a legacy token
  if (credentials.accessToken && !credentials.refreshToken) {
    console.log("⚠️ Token Type: LEGACY (No Refresh Token)");
    return true;
  }
  
  console.log("✅ Token Type: JWT (Modern OAuth Token)");
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
