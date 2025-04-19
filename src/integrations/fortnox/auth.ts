
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FortnoxCredentials, RefreshResult } from "./types";
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
            const errorContent = proxyError.message as string || '';
            if (errorContent.includes('{') && errorContent.includes('}')) {
              const jsonStart = errorContent.indexOf('{');
              const jsonEnd = errorContent.lastIndexOf('}') + 1;
              
              if (jsonStart >= 0 && jsonEnd > jsonStart) {
                errorData = JSON.parse(errorContent.substring(jsonStart, jsonEnd));
                
                if (errorData) {
                  if (errorData.error === 'invalid_grant' && 
                      typeof errorData.error_description === 'string' && 
                      errorData.error_description.includes('expired')) {
                    throw {
                      error: 'invalid_grant',
                      error_description: 'Authorization code has expired',
                      error_hint: 'Please try connecting to Fortnox again',
                      request_needs_retry: true
                    };
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
            throw parseError;
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
        if (proxyResponse.error === 'invalid_grant' && 
            typeof proxyResponse.error_description === 'string' && 
            proxyResponse.error_description.includes('expired')) {
          throw {
            error: 'invalid_grant',
            error_description: 'Authorization code has expired',
            error_hint: 'Please try connecting to Fortnox again',
            request_needs_retry: true
          };
        }
        
        throw new Error(`Fortnox API error: ${proxyResponse.error} - ${proxyResponse.error_description || ''}`);
      }
      
      if (!proxyResponse.access_token) {
        console.error("Invalid response from edge function:", proxyResponse);
        throw new Error("Invalid response from proxy service - missing access token");
      }
      
      console.log("Token exchange successful via Edge Function");
      
      return {
        accessToken: proxyResponse.access_token,
        refreshToken: proxyResponse.refresh_token
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
 * Refresh Fortnox access token
 * This function refreshes the access token using the refresh token
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<RefreshResult> {
  try {
    console.log("Refreshing Fortnox access token");
    
    // Call the token refresh edge function
    const { data, error } = await supabase.functions.invoke('fortnox-token-refresh', {
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (error) {
      console.error("Error refreshing token via edge function:", error);
      
      // Check if this is a refresh token invalid error
      if (error.message && 
         (error.message.includes('invalid_grant') || 
          error.message.includes('Invalid refresh token'))) {
        return {
          success: false,
          message: "Refresh token is invalid or expired",
          requiresReconnect: true,
          error
        };
      }
      
      return {
        success: false,
        message: error.message || "Unknown error refreshing token",
        error
      };
    }
    
    if (!data || !data.access_token) {
      console.error("Invalid response from token refresh:", data);
      return {
        success: false,
        message: "Invalid response from token refresh service"
      };
    }
    
    console.log("Token refresh successful");
    
    return {
      success: true,
      message: "Token refreshed successfully",
      credentials: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken
      }
    };
  } catch (error) {
    console.error("Exception in refreshAccessToken:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error in token refresh",
      error
    };
  }
}

/**
 * Triggers a system-level token refresh via the scheduled refresh function
 * This is used to force a refresh of the token without requiring user authentication
 */
export async function triggerSystemTokenRefresh(force: boolean = false): Promise<boolean> {
  try {
    console.log("Triggering system-level token refresh");
    
    // Call the scheduled refresh function with the force flag
    const { data, error } = await supabase.functions.invoke('fortnox-scheduled-refresh', {
      body: JSON.stringify({ force }),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (error) {
      console.error("Error triggering system token refresh:", error);
      return false;
    }
    
    console.log("System token refresh response:", data);
    return true;
  } catch (error) {
    console.error("Failed to trigger system token refresh:", error);
    return false;
  }
}

/**
 * Forces a refresh of the Fortnox access token
 * This function can be called from the frontend to trigger a manual token refresh
 * @returns {Promise<boolean>} True if the refresh was successful, false otherwise
 */
export async function forceTokenRefresh(): Promise<boolean> {
  try {
    console.log("Force refreshing Fortnox access token");
    
    // Use the supabase.functions.invoke method instead of direct fetch
    const { data, error } = await supabase.functions.invoke('fortnox-scheduled-refresh', {
      body: JSON.stringify({ force: true }),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (error) {
      console.error("Failed to force refresh token:", error);
      return false;
    }
    
    console.log("Force token refresh result:", data);
    
    return !!data?.success;
  } catch (error) {
    console.error("Error in force refreshing token:", error);
    return false;
  }
}
