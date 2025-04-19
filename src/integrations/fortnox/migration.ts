
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FortnoxCredentials, TokenMigrationResponse } from "./types"; 
import { triggerSystemTokenRefresh } from "./auth";

/**
 * Migrates a legacy access token to a modern OAuth token
 * @param clientId The Fortnox client ID
 * @param clientSecret The Fortnox client secret
 * @param legacyToken The legacy access token
 */
export async function migrateLegacyToken(
  clientId: string,
  clientSecret: string,
  legacyToken: string
): Promise<TokenMigrationResponse> {
  try {
    console.log("Migrating legacy token to OAuth token");
    
    if (!clientId || !clientSecret || !legacyToken) {
      console.error("Missing required parameters for token migration");
      return {
        success: false,
        message: "Missing required parameters for token migration"
      };
    }
    
    // Prepare migration payload
    const migrationData = {
      client_id: clientId,
      client_secret: clientSecret,
      legacy_token: legacyToken
    };
    
    // Call the migration edge function
    const { data, error } = await supabase.functions.invoke('fortnox-token-migrate', {
      body: JSON.stringify(migrationData)
    });
    
    if (error) {
      console.error("Migration edge function error:", error);
      return {
        success: false,
        message: `Migration failed: ${error.message || "Unknown error"}`
      };
    }
    
    if (!data || !data.success || !data.access_token || !data.refresh_token) {
      console.error("Invalid response from migration function:", data);
      return {
        success: false,
        message: "Invalid response from migration service"
      };
    }
    
    console.log("Migration successful, updating credentials");
    
    // Save the new tokens
    const updatedCredentials: FortnoxCredentials = {
      clientId,
      clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isLegacyToken: false
    };
    
    // Update stored credentials - Convert FortnoxCredentials to a proper JSON object
    const { error: saveError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: updatedCredentials as Record<string, any>
      }, {
        onConflict: 'id'
      });
      
    if (saveError) {
      console.error("Error saving migrated tokens:", saveError);
      return {
        success: false,
        message: `Tokens migrated but could not be saved: ${saveError.message}`
      };
    }
    
    // Provide successful response
    return {
      success: true,
      message: "Legacy token successfully migrated to OAuth token",
      newCredentials: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      }
    };
  } catch (error) {
    console.error("Error migrating legacy token:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error in token migration"
    };
  }
}
