
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
    console.log("Received access token length:", data.access_token.length);
    console.log("Received refresh token length:", data.refresh_token.length);
    
    // Save the new tokens
    const updatedCredentials: FortnoxCredentials = {
      clientId,
      clientSecret,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isLegacyToken: false
    };
    
    // Create a simple object for storage - this ensures JSON serialization works properly
    const storageObj = {
      clientId: updatedCredentials.clientId,
      clientSecret: updatedCredentials.clientSecret,
      accessToken: updatedCredentials.accessToken,
      refreshToken: updatedCredentials.refreshToken,
      isLegacyToken: updatedCredentials.isLegacyToken
    };
    
    // Update stored credentials with a proper JSON object
    const { error: saveError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: storageObj
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
    
    // Verify that we saved the complete token
    const { data: verifyData } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
      
    if (verifyData && verifyData.settings && verifyData.settings.accessToken) {
      const savedTokenLength = verifyData.settings.accessToken.length;
      console.log(`Verification - Saved token length: ${savedTokenLength}`);
      
      if (savedTokenLength !== data.access_token.length) {
        console.error(`Token length mismatch! Original: ${data.access_token.length}, Saved: ${savedTokenLength}`);
      }
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
