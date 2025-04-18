
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FortnoxCredentials, TokenMigrationResponse } from "./types";
import { saveFortnoxCredentials } from "./credentials";

/**
 * Migrates a legacy Fortnox token to a JWT token
 * @param clientId The Fortnox client ID
 * @param clientSecret The Fortnox client secret
 * @param legacyToken The legacy access token to migrate
 */
export async function migrateLegacyToken(
  clientId: string,
  clientSecret: string,
  legacyToken: string
): Promise<FortnoxCredentials | null> {
  try {
    console.log("Migrating legacy token to JWT");
    
    if (!clientId || !clientSecret || !legacyToken) {
      const missingParams = [];
      if (!clientId) missingParams.push('clientId');
      if (!clientSecret) missingParams.push('clientSecret');
      if (!legacyToken) missingParams.push('legacyToken');
      
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Call the edge function to perform the migration
    const { data: migrationResponse, error: migrationError } = await supabase.functions.invoke('fortnox-token-migrate', {
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        access_token: legacyToken
      })
    });
    
    if (migrationError) {
      console.error("Error calling token migration edge function:", migrationError);
      throw new Error(`Migration failed: ${migrationError.message || 'Unknown error'}`);
    }
    
    if (!migrationResponse) {
      console.error("Empty response from edge function");
      throw new Error("Empty response from migration service");
    }
    
    if (migrationResponse.error) {
      console.error("Fortnox API returned an error:", migrationResponse);
      throw new Error(`Fortnox API error: ${migrationResponse.error} - ${migrationResponse.details || ''}`);
    }
    
    if (!migrationResponse.access_token || !migrationResponse.refresh_token) {
      console.error("Invalid response from edge function:", migrationResponse);
      throw new Error("Invalid response from migration service - missing tokens");
    }
    
    console.log("Token migration successful");
    
    // Create the new credentials object with JWT tokens
    const response = migrationResponse as TokenMigrationResponse;
    const expiresAt = Date.now() + (response.expires_in * 1000);
    
    // Set a long expiration time for refresh tokens (45 days in milliseconds)
    const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000);
    
    const newCredentials: FortnoxCredentials = {
      clientId,
      clientSecret,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt,
      refreshTokenExpiresAt,
      isLegacyToken: false // This is now a JWT token
    };
    
    // Save the new credentials
    await saveFortnoxCredentials(newCredentials);
    
    console.log("New JWT credentials saved successfully");
    return newCredentials;
  } catch (error) {
    console.error("Error migrating legacy token:", error);
    
    if (error instanceof Error && 
        (error.message.includes('not found') || 
         error.message.includes('404') ||
         error.message.includes('Access-token not found'))) {
      toast.error("Legacy token not found or already migrated", {
        description: "The token may have already been migrated or is invalid."
      });
    } else if (error instanceof Error && 
               (error.message.includes('incorrect auth flow') || 
                error.message.includes('auth flow type'))) {
      toast.error("Migration failed: Incorrect auth flow type", {
        description: "Please ensure your Fortnox integration is set to use OAuth 2.0 flow in the developer portal."
      });
    } else {
      toast.error("Failed to migrate legacy token", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
    
    throw error;
  }
}

/**
 * Check if the current token is a legacy token
 * @param credentials The Fortnox credentials to check
 */
export function isLegacyToken(credentials: FortnoxCredentials | null): boolean {
  if (!credentials || !credentials.accessToken) {
    return false;
  }
  
  // If explicitly marked as legacy token
  if (credentials.isLegacyToken === true) {
    return true;
  }
  
  // If we have an access token but no refresh token, it's likely a legacy token
  if (credentials.accessToken && !credentials.refreshToken) {
    return true;
  }
  
  return false;
}
