
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FortnoxCredentials, FortnoxError } from "./types";
import { environment } from "@/config/environment";

/**
 * Exchange the authorization code for access and refresh tokens
 * @param code The authorization code from Fortnox
 * @param clientId The Fortnox client ID
 * @param clientSecret The Fortnox client secret
 * @param redirectUri The redirect URI used in the initial request
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<Partial<FortnoxCredentials>> {
  try {
    console.log("Exchanging code for tokens with parameters:", {
      codeLength: code ? code.length : 0,
      code: code ? `${code.substring(0, 5)}...` : 'missing',
      clientIdLength: clientId ? clientId.length : 0,
      clientId: clientId ? `${clientId.substring(0, 5)}...` : 'missing',
      clientSecretLength: clientSecret ? clientSecret.length : 0,
      redirectUri
    });
    
    if (!code || !clientId || !clientSecret || !redirectUri) {
      const missingParams = [];
      if (!code) missingParams.push('code');
      if (!clientId) missingParams.push('clientId');
      if (!clientSecret) missingParams.push('clientSecret');
      if (!redirectUri) missingParams.push('redirectUri');
      
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Additional validation for parameter lengths
    if (clientId.length < 5) {
      throw new Error("Client ID appears to be too short or invalid");
    }
    
    if (clientSecret.length < 5) {
      throw new Error("Client Secret appears to be too short or invalid");
    }
    
    if (code.length < 5) {
      throw new Error("Authorization code appears to be too short or invalid");
    }
    
    // Prepare the token request data for sending to our edge function
    const tokenExchangeData = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };
    
    // Log the request details for debugging
    console.log("Making token exchange request via Edge Function");
    
    try {
      // Make sure the function URL is correctly configured
      console.log("Using edge function URL from environment:", environment.supabase.url);
      console.log("Testing Edge Function connectivity");
      
      // Now call the actual token exchange endpoint
      console.log("Calling token exchange edge function...");
      const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('fortnox-token-exchange', {
        body: JSON.stringify(tokenExchangeData)
      });
      
      console.log("Edge function response received:", proxyResponse ? "success" : "empty");
      
      if (proxyError) {
        console.error("Error calling Supabase Edge Function:", proxyError);
        
        // Try to extract more detailed error information
        let detailedError = proxyError.message || "Unknown edge function error";
        let errorData = null;
        
        // Try to parse the error response if available
        try {
          if (typeof proxyError === 'object' && 'message' in proxyError) {
            const errorMessage = proxyError.message as string || '';
            
            if (errorMessage.includes('invalid_grant')) {
              throw {
                error: 'invalid_grant',
                error_description: 'Authorization code is invalid or has expired',
                error_hint: 'Please try connecting to Fortnox again',
                request_needs_retry: true
              } as FortnoxError;
            }
            
            if (errorMessage.includes('{') && errorMessage.includes('}')) {
              const jsonStart = errorMessage.indexOf('{');
              const jsonEnd = errorMessage.lastIndexOf('}') + 1;
              
              if (jsonStart >= 0 && jsonEnd > jsonStart) {
                errorData = JSON.parse(errorMessage.substring(jsonStart, jsonEnd));
                
                if (errorData) {
                  if (errorData.error === 'invalid_grant') {
                    throw {
                      error: 'invalid_grant',
                      error_description: 'Authorization code has expired',
                      error_hint: 'Please try connecting to Fortnox again',
                      request_needs_retry: true
                    } as FortnoxError;
                  }
                  
                  if (errorData.error) {
                    detailedError = `Fortnox API error: ${errorData.error}${
                      errorData.error_description ? ' - ' + errorData.error_description : ''
                    }`;
                  }
                }
              }
            }
          }
        } catch (parseError) {
          if (parseError && typeof parseError === 'object' && 'request_needs_retry' in parseError) {
            throw parseError as FortnoxError;
          }
          console.log("Could not parse error details:", parseError);
        }
        
        throw new Error(`Edge function error: ${detailedError}`);
      }
      
      if (!proxyResponse) {
        console.error("Empty response from edge function");
        throw new Error("Empty response from edge function");
      }
      
      // Check for Fortnox API errors in the response
      if (proxyResponse.error) {
        console.error("Fortnox API returned an error:", proxyResponse);
        
        // Special handling for expired code
        if (proxyResponse.error === 'invalid_grant') {
          throw {
            error: 'invalid_grant',
            error_description: 'Authorization code has expired or is invalid',
            error_hint: 'Please try connecting to Fortnox again',
            request_needs_retry: true
          } as FortnoxError;
        }
        
        // Special handling for invalid client
        if (proxyResponse.error === 'invalid_client') {
          throw new Error(`Invalid client credentials (client ID or secret). Please check your Fortnox integration settings.`);
        }
        
        throw new Error(`Fortnox API error: ${proxyResponse.error} - ${proxyResponse.error_description || ''}`);
      }
      
      if (!proxyResponse.access_token) {
        console.error("Invalid response from edge function:", proxyResponse);
        throw new Error("Invalid response from proxy service - missing access token");
      }
      
      console.log("Token exchange successful via Edge Function");
      
      // Calculate token expiration time
      const expiresAt = Date.now() + (proxyResponse.expires_in || 3600) * 1000;
      
      return {
        accessToken: proxyResponse.access_token,
        refreshToken: proxyResponse.refresh_token,
        expiresAt,
        migratedToJwt: true // Mark as already migrated since new tokens from OAuth 2.0 are already JWT-based
      };
    } catch (edgeFunctionError) {
      // If edge function fails, log the error and throw it
      console.error("Edge function failed:", edgeFunctionError);
      throw edgeFunctionError;
    }
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    
    // Check if this is a CORS or network error
    if (error instanceof Error && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('NetworkError') ||
         error.message.includes('Network request failed'))) {
      throw new Error('Network error connecting to Fortnox API. This could be due to CORS restrictions or network connectivity issues.');
    }
    
    throw error;
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<Partial<FortnoxCredentials>> {
  try {
    console.log("Refreshing Fortnox access token");
    
    if (!clientId || !clientSecret || !refreshToken) {
      const missingParams = [];
      if (!clientId) missingParams.push('clientId');
      if (!clientSecret) missingParams.push('clientSecret');
      if (!refreshToken) missingParams.push('refreshToken');
      
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Similar approach as the token exchange - using the token-refresh edge function
    const refreshData = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    };
    
    // Use the token-refresh edge function
    try {
      console.log("Attempting to use Supabase Edge Function for token refresh");
      
      const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('fortnox-token-refresh', {
        body: JSON.stringify(refreshData)
      });
      
      console.log("Edge function response received:", proxyResponse ? "success" : "empty");
      
      if (proxyError) {
        console.error("Error calling refresh token edge function:", proxyError);
        throw new Error(`Edge function error: ${proxyError.message}`);
      }
      
      if (!proxyResponse) {
        console.error("Empty response from edge function for refresh");
        throw new Error("Empty response from edge function");
      }
      
      if (!proxyResponse.access_token) {
        console.error("Invalid response from edge function for refresh:", proxyResponse);
        
        // If we have an error in the response, use that
        if (proxyResponse.error) {
          throw new Error(`Fortnox API error: ${proxyResponse.error} - ${proxyResponse.error_description || ''}`);
        }
        
        throw new Error("Invalid response from proxy service");
      }
      
      console.log("Token refresh successful via Edge Function");
      
      // Calculate token expiration time
      const expiresAt = Date.now() + (proxyResponse.expires_in || 3600) * 1000;
      
      return {
        accessToken: proxyResponse.access_token,
        refreshToken: proxyResponse.refresh_token || refreshToken, // Use new refresh token if provided
        expiresAt,
        migratedToJwt: true // Mark as migrated since we're using OAuth 2.0 refresh flow
      };
    } catch (edgeFunctionError) {
      // Log and throw the error
      console.error("Edge function for refresh token failed:", edgeFunctionError);
      throw new Error(`Edge function error: ${edgeFunctionError.message || 'Unknown edge function error'}`);
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Migrate legacy access token to JWT-based authentication
 * This function handles the migration of legacy Fortnox tokens to the new JWT-based authentication system
 * Must be called before April 30, 2025 to ensure continued API access
 */
export async function migrateToJwtAuthentication(
  clientId: string,
  clientSecret: string,
  legacyToken: string
): Promise<Partial<FortnoxCredentials>> {
  try {
    console.log("Starting migration to JWT-based authentication");
    
    if (!clientId || !clientSecret || !legacyToken) {
      const missingParams = [];
      if (!clientId) missingParams.push('clientId');
      if (!clientSecret) missingParams.push('clientSecret');
      if (!legacyToken) missingParams.push('legacyToken');
      
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }
    
    // Prepare data for migration request
    const migrationData = {
      client_id: clientId,
      client_secret: clientSecret,
      access_token: legacyToken
    };
    
    // Call the migration edge function
    console.log("Calling fortnox-token-migration edge function");
    const { data: migrationResponse, error: migrationError } = await supabase.functions.invoke('fortnox-token-migration', {
      body: JSON.stringify(migrationData)
    });
    
    if (migrationError) {
      console.error("Migration edge function error:", migrationError);
      
      // Try to parse error details from the error message
      let errorMessage = `Migration failed: ${migrationError.message}`;
      
      // Handle specific error types
      if (migrationError.message && migrationError.message.includes('Access-token not found')) {
        return {
          migrationSkipped: true,
          migrationError: "The legacy token is not valid or has expired. You need to reconnect your Fortnox account.",
          migrationLastAttempt: Date.now(),
          migrationAttemptCount: 1
        };
      }
      
      if (migrationError.message && migrationError.message.includes('incorrect auth flow')) {
        return {
          migrationSkipped: true,
          migrationError: "Incorrect authentication flow type. The integration needs to be set to use OAuth 2.0.",
          migrationLastAttempt: Date.now(),
          migrationAttemptCount: 1
        };
      }
      
      try {
        if (typeof migrationError.message === 'string' && migrationError.message.includes('{')) {
          const jsonStart = migrationError.message.indexOf('{');
          const jsonEnd = migrationError.message.lastIndexOf('}') + 1;
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const errorData = JSON.parse(migrationError.message.substring(jsonStart, jsonEnd));
            if (errorData.error) {
              // Handle specific error types
              if (errorData.error === 'invalid_client') {
                errorMessage = `Migration failed: Invalid client credentials (client ID or client secret)`;
              } else if (errorData.error === 'token_not_found' || errorData.error === 'invalid_token') {
                return {
                  migrationSkipped: true,
                  migrationError: "The legacy token is not valid or has expired. You need to reconnect your Fortnox account.",
                  migrationLastAttempt: Date.now(),
                  migrationAttemptCount: 1
                };
              } else if (errorData.error === 'jwt_creation_not_allowed') {
                errorMessage = `Migration failed: ${errorData.error_description || 'Your account is not allowed to create JWT tokens'}`;
              } else if (errorData.error === 'jwt_creation_failed') {
                errorMessage = `Migration failed: ${errorData.error_description || 'Failed to create JWT token'}`;
              } else if (errorData.error === 'incorrect_auth_flow') {
                return {
                  migrationSkipped: true,
                  migrationError: "The integration needs to be set to use OAuth 2.0 in the Fortnox developer portal.",
                  migrationLastAttempt: Date.now(),
                  migrationAttemptCount: 1
                };
              } else {
                errorMessage = `Migration failed: ${errorData.error}${
                  errorData.error_description ? ' - ' + errorData.error_description : ''
                }`;
              }
            }
          }
        }
      } catch (parseError) {
        console.error("Error parsing error message:", parseError);
      }
      
      throw new Error(errorMessage);
    }
    
    if (!migrationResponse) {
      console.error("Empty response from migration edge function");
      throw new Error("Migration failed: Empty response from server");
    }
    
    if (migrationResponse.error) {
      console.error("Fortnox API returned an error during migration:", migrationResponse);
      
      // Handle specific error types
      if (migrationResponse.error === 'invalid_token' || migrationResponse.error === 'token_not_found') {
        return {
          migrationSkipped: true,
          migrationError: "The legacy token is not valid or has expired. You need to reconnect your Fortnox account.",
          migrationLastAttempt: Date.now(),
          migrationAttemptCount: 1
        };
      } else if (migrationResponse.error === 'invalid_client') {
        throw new Error(`Migration failed: Invalid client credentials (client ID or client secret)`);
      } else if (migrationResponse.error === 'jwt_creation_not_allowed') {
        throw new Error(`Migration failed: ${migrationResponse.error_description || 'Your account is not allowed to create JWT tokens'}`);
      } else if (migrationResponse.error === 'jwt_creation_failed') {
        throw new Error(`Migration failed: ${migrationResponse.error_description || 'Failed to create JWT token'}`);
      } else if (migrationResponse.error === 'incorrect_auth_flow') {
        return {
          migrationSkipped: true,
          migrationError: "The integration needs to be set to use OAuth 2.0 in the Fortnox developer portal.",
          migrationLastAttempt: Date.now(),
          migrationAttemptCount: 1
        };
      }
      
      throw new Error(`Migration failed: ${migrationResponse.error} - ${migrationResponse.error_description || ''}`);
    }
    
    if (!migrationResponse.access_token || !migrationResponse.refresh_token) {
      console.error("Invalid response from migration function:", migrationResponse);
      throw new Error("Migration failed: Missing tokens in response");
    }
    
    console.log("JWT migration successful");
    
    // Calculate token expiration time
    const expiresAt = Date.now() + (migrationResponse.expires_in || 3600) * 1000;
    
    return {
      accessToken: migrationResponse.access_token,
      refreshToken: migrationResponse.refresh_token,
      expiresAt,
      migratedToJwt: true
    };
  } catch (error) {
    console.error('Error migrating to JWT authentication:', error);
    throw error;
  }
}
