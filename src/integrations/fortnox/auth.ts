
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
      
      // Calculate token expiration time
      const expiresAt = Date.now() + (proxyResponse.expires_in || 3600) * 1000;
      
      return {
        accessToken: proxyResponse.access_token,
        refreshToken: proxyResponse.refresh_token,
        expiresAt,
        expiresIn: proxyResponse.expires_in,
        // Set a default refresh token expiration - 45 days from now (in milliseconds)
        refreshTokenExpiresAt: Date.now() + (45 * 24 * 60 * 60 * 1000),
        // Reset refresh failure counters when getting a new token
        refreshFailCount: 0,
        lastRefreshAttempt: null
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
 * Returns a RefreshResult object with success/failure details
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<RefreshResult> {
  try {
    console.log("Refreshing Fortnox access token");
    
    if (!clientId || !clientSecret || !refreshToken) {
      const missingParams = [];
      if (!clientId) missingParams.push('clientId');
      if (!clientSecret) missingParams.push('clientSecret');
      if (!refreshToken) missingParams.push('refreshToken');
      
      return {
        success: false,
        message: `Missing required parameters: ${missingParams.join(', ')}`,
        requiresReconnect: true
      };
    }
    
    // Prepare data for the token refresh request
    const refreshData = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    };
    
    // Log refresh attempt
    console.log("Attempting to refresh Fortnox token via Edge Function");
    
    try {
      // Call the token-refresh edge function directly with credentials
      const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('fortnox-token-refresh', {
        body: JSON.stringify(refreshData),
        // We no longer send the API key in the header as it's not available in the frontend
        // The edge function will handle authentication differently
      });
      
      console.log("Edge function response received:", proxyResponse ? "success" : "empty");
      
      if (proxyError) {
        console.error("Error calling refresh token edge function:", proxyError);
        
        // Try to extract more detailed error information
        let errorMessage = proxyError.message || "Unknown edge function error";
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
                    return {
                      success: false,
                      message: 'Invalid refresh token',
                      error: errorData,
                      requiresReconnect: true
                    };
                  }
                  
                  if (errorData.error) {
                    errorMessage = `Fortnox API error: ${errorData.error}${
                      errorData.error_description ? ' - ' + errorData.error_description : ''
                    }`;
                  }
                }
              }
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error details:", parseError);
        }
        
        return {
          success: false,
          message: errorMessage,
          error: proxyError
        };
      }
      
      if (!proxyResponse) {
        console.error("Empty response from edge function for refresh");
        return {
          success: false,
          message: "Empty response from edge function"
        };
      }
      
      if (proxyResponse.error) {
        console.error("Fortnox API error in refresh:", proxyResponse);
        
        // Check for invalid refresh token
        if (proxyResponse.error === 'invalid_grant' && 
            proxyResponse.error_description === 'Invalid refresh token') {
          return {
            success: false,
            message: "Invalid refresh token - user needs to reconnect",
            error: proxyResponse,
            requiresReconnect: true
          };
        }
        
        return {
          success: false,
          message: `Fortnox API error: ${proxyResponse.error} - ${proxyResponse.error_description || ''}`,
          error: proxyResponse
        };
      }
      
      if (!proxyResponse.access_token) {
        console.error("Invalid response from edge function for refresh:", proxyResponse);
        return {
          success: false,
          message: "Invalid response - missing access token"
        };
      }
      
      console.log("Token refresh successful via Edge Function");
      
      // Calculate token expiration time
      const expiresAt = Date.now() + (proxyResponse.expires_in || 3600) * 1000;
      
      // Set refresh token expiration to 45 days from now
      const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000);
      
      return {
        success: true,
        message: "Token refresh successful",
        credentials: {
          accessToken: proxyResponse.access_token,
          refreshToken: proxyResponse.refresh_token || refreshToken, // Use new refresh token if provided
          expiresAt,
          expiresIn: proxyResponse.expires_in,
          refreshTokenExpiresAt,
          refreshFailCount: 0, // Reset failure count on successful refresh
          lastRefreshAttempt: Date.now()
        }
      };
    } catch (edgeFunctionError) {
      // Log and return the error
      console.error("Edge function for refresh token failed:", edgeFunctionError);
      return {
        success: false,
        message: `Edge function error: ${edgeFunctionError.message || 'Unknown edge function error'}`,
        error: edgeFunctionError
      };
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      success: false,
      message: `Unexpected error: ${error.message || 'Unknown error'}`,
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
