
import { supabase } from "@/lib/supabase";
import { FortnoxCredentials } from "./types";
import { refreshAccessToken, migrateToJwtAuthentication } from "./auth";
import { toast } from "sonner";

/**
 * Save Fortnox credentials to the database
 */
export async function saveFortnoxCredentials(credentials: FortnoxCredentials): Promise<void> {
  try {
    const credentialsObj = { ...credentials };
    
    // Set refresh token expiration to 43 days (2 days before actual expiration for safety)
    if (credentials.refreshToken) {
      credentialsObj.refreshTokenExpiresAt = Date.now() + (43 * 24 * 60 * 60 * 1000);
    }
    
    // Set access token expiration to 45 minutes (15 minutes before actual expiration)
    if (credentials.accessToken) {
      credentialsObj.expiresAt = Date.now() + (45 * 60 * 1000);
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
      
    if (error) throw error;
    
    console.log("Fortnox credentials saved successfully");
  } catch (error) {
    console.error('Error saving Fortnox credentials:', error);
    throw error;
  }
}

/**
 * Check if migration to JWT is needed and perform it if required
 */
async function checkAndPerformJwtMigration(credentials: FortnoxCredentials): Promise<FortnoxCredentials> {
  // Only attempt migration if:
  // 1. Migration hasn't been done yet (no migratedToJwt flag)
  // 2. We have all required credentials
  if (!credentials.migratedToJwt && 
      credentials.clientId && 
      credentials.clientSecret && 
      credentials.accessToken) {
    
    try {
      console.log("JWT migration needed, attempting migration...");
      
      // Check if we should show migration notification
      const migrationDeadline = new Date('2025-04-30').getTime();
      const daysUntilDeadline = Math.ceil((migrationDeadline - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline <= 60) {
        // Show warning for users if within 60 days of deadline
        toast.warning(
          `Fortnox API is changing on April 30, 2025. Migrating your connection now (${daysUntilDeadline} days remaining).`, 
          { duration: 8000 }
        );
      }
      
      // Perform the migration
      const migrationResult = await migrateToJwtAuthentication(
        credentials.clientId,
        credentials.clientSecret,
        credentials.accessToken
      );
      
      if (migrationResult) {
        // Update credentials with migration results
        const updatedCredentials = {
          ...credentials,
          ...migrationResult,
          migratedToJwt: true
        };
        
        // Save the migrated credentials
        await saveFortnoxCredentials(updatedCredentials);
        
        console.log("JWT migration completed successfully");
        toast.success("Fortnox connection has been upgraded to the new authentication system.");
        
        return updatedCredentials;
      }
    } catch (error) {
      console.error("JWT migration failed:", error);
      
      // Don't block access due to migration failure, just log and notify
      toast.error(
        "Fortnox connection upgrade failed. You may need to reconnect before April 30, 2025.", 
        { duration: 10000 }
      );
    }
  }
  
  return credentials;
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
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        break;
      }
    }
    
    if (error || !data || !data.settings) {
      return null;
    }
    
    const settingsData = data.settings as unknown as FortnoxCredentials;
    
    if (!settingsData.clientId || !settingsData.clientSecret) {
      return null;
    }
    
    // Check if migration to JWT is needed
    const migrationDeadline = new Date('2025-04-30').getTime();
    const currentDate = Date.now();
    
    if (currentDate < migrationDeadline && !settingsData.migratedToJwt) {
      // Attempt JWT migration if we're before the deadline and haven't migrated yet
      const migratedCredentials = await checkAndPerformJwtMigration(settingsData);
      if (migratedCredentials !== settingsData) {
        // If migration succeeded, use the new credentials
        settingsData.accessToken = migratedCredentials.accessToken;
        settingsData.refreshToken = migratedCredentials.refreshToken;
        settingsData.expiresAt = migratedCredentials.expiresAt;
        settingsData.migratedToJwt = true;
      }
    }
    
    // Check refresh token expiration - proactively refresh 2 days before expiration
    if (settingsData.refreshToken && settingsData.refreshTokenExpiresAt) {
      const daysUntilExpiration = (settingsData.refreshTokenExpiresAt - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiration <= 0) {
        toast.error("Your Fortnox connection has expired. Please reconnect to continue.", {
          duration: 10000,
        });
        return settingsData;
      }
      
      // Warn user 5 days before expiration
      if (daysUntilExpiration <= 5) {
        toast.warning(`Your Fortnox connection will expire in ${Math.ceil(daysUntilExpiration)} days. Please reconnect soon to avoid interruption.`, {
          duration: 10000,
        });
      }
    }
    
    // Refresh access token if it expires within 30 minutes (increased buffer)
    if (settingsData.accessToken && settingsData.expiresAt) {
      const minutesUntilExpiration = (settingsData.expiresAt - Date.now()) / (1000 * 60);
      const shouldRefresh = minutesUntilExpiration < 30;
      
      if (shouldRefresh) {
        try {
          if (!settingsData.refreshToken) {
            console.error("Cannot refresh: No refresh token available");
            return settingsData;
          }
          
          const refreshed = await refreshAccessToken(
            settingsData.clientId,
            settingsData.clientSecret,
            settingsData.refreshToken
          );
          
          const updatedCredentials = {
            ...settingsData,
            ...refreshed,
            refreshTokenExpiresAt: Date.now() + (43 * 24 * 60 * 60 * 1000), // 43 days
            expiresAt: Date.now() + (45 * 60 * 1000) // 45 minutes
          };
          
          await saveFortnoxCredentials(updatedCredentials);
          console.log("Successfully refreshed and saved new access token");
          return updatedCredentials;
        } catch (refreshError) {
          console.error("Error refreshing access token:", refreshError);
          
          if (minutesUntilExpiration > 0) {
            return settingsData;
          }
          
          toast.error("Failed to refresh Fortnox connection. Please reconnect if issues persist.", {
            duration: 10000,
          });
          return null;
        }
      }
    }
    
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
