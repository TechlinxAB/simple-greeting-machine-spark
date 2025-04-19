import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { FortnoxCredentials, RefreshResult } from "./types";
import { environment } from "@/config/environment";
import { getFortnoxCredentials, saveFortnoxCredentials } from "./credentials";

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<Partial<FortnoxCredentials>> {
  const operationId = Math.random().toString(36).substring(2, 10);
  
  try {
    console.log(`[${operationId}] 🔄 Exchanging code for tokens with parameters:`, {
      codeLength: code ? code.length : 0,
      codePreview: code ? `${code.substring(0, 5)}...` : 'missing',
      clientIdLength: clientId ? clientId.length : 0,
      clientIdPreview: clientId ? `${clientId.substring(0, 5)}...` : 'missing',
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
    
    if (clientId.length < 5) {
      throw new Error("Client ID appears to be too short or invalid");
    }
    
    if (clientSecret.length < 5) {
      throw new Error("Client Secret appears to be too short or invalid");
    }
    
    if (code.length < 5) {
      throw new Error("Authorization code appears to be too short or invalid");
    }
    
    const tokenExchangeData = {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    };
    
    console.log(`[${operationId}] 🔄 Making token exchange request via Edge Function`);
    
    try {
      console.log(`[${operationId}] Using edge function URL from environment:`, environment.supabase.url);
      
      console.log(`[${operationId}] Calling token exchange edge function with code:`, `${code.substring(0, 5)}...`);
      
      const { data: proxyResponse, error: proxyError } = await supabase.functions.invoke('fortnox-token-exchange', {
        body: JSON.stringify(tokenExchangeData)
      });
      
      console.log(`[${operationId}] Edge function response received:`, proxyResponse ? "success" : "empty");
      
      if (proxyError) {
        console.error(`[${operationId}] Error calling Supabase Edge Function:`, proxyError);
        
        let detailedError = proxyError.message || "Unknown edge function error";
        let errorData = null;
        
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
          console.log(`[${operationId}] Could not parse error details:`, parseError);
        }
        
        throw new Error(`Edge function error: ${detailedError}`);
      }
      
      if (!proxyResponse) {
        console.error(`[${operationId}] Empty response from edge function`);
        throw new Error("Empty response from edge function");
      }
      
      if (proxyResponse.error) {
        console.error(`[${operationId}] Fortnox API returned an error:`, proxyResponse);
        
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
        console.error(`[${operationId}] Invalid response from edge function:`, proxyResponse);
        throw new Error("Invalid response from proxy service - missing access token");
      }
      
      const debugInfo = proxyResponse._debug || {};
      
      console.log(`[${operationId}] ✅ Token exchange successful via Edge Function`);
      console.log(`[${operationId}] 🔑 Received tokens from Fortnox:`, {
        accessTokenLength: proxyResponse.access_token.length,
        refreshTokenLength: proxyResponse.refresh_token?.length || 0,
        accessTokenPreview: `${proxyResponse.access_token.substring(0, 20)}...${proxyResponse.access_token.substring(proxyResponse.access_token.length - 20)}`,
        refreshTokenPreview: proxyResponse.refresh_token ? 
          `${proxyResponse.refresh_token.substring(0, 10)}...${proxyResponse.refresh_token.substring(proxyResponse.refresh_token.length - 5)}` : 
          'none',
        session_id: debugInfo.session_id || 'none',
        access_token_hash_excerpt: debugInfo.access_token_hash ? `${debugInfo.access_token_hash.substring(0, 10)}...` : 'none'
      });
      
      await delay(500);
      
      return {
        accessToken: proxyResponse.access_token,
        refreshToken: proxyResponse.refresh_token
      };
    } catch (edgeFunctionError) {
      console.error(`[${operationId}] Edge function failed:`, edgeFunctionError);
      throw edgeFunctionError;
    }
  } catch (error) {
    console.error(`[${operationId}] Error exchanging code for tokens:`, error);
    
    if (error instanceof Error && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('NetworkError') ||
         error.message.includes('Network request failed'))) {
      throw new Error('Network error connecting to Fortnox API. This could be due to CORS restrictions or network connectivity issues.');
    }
    
    throw error;
  }
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<RefreshResult> {
  try {
    console.log("Refreshing Fortnox access token");
    
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

export async function triggerSystemTokenRefresh(force = false): Promise<boolean> {
  try {
    console.log(`Triggering system token refresh (force: ${force})`);
    
    const { data: response, error } = await supabase.functions.invoke('fortnox-scheduled-refresh', {
      body: JSON.stringify({ force }),
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (error) {
      console.error("Error in token refresh function:", error);
      return false;
    }
    
    console.log("Token refresh response:", response);
    return response?.success || false;
  } catch (error) {
    console.error("Error during system token refresh:", error);
    return false;
  }
}

export async function forceTokenRefresh(): Promise<boolean> {
  try {
    console.log("Forcing token refresh");
    
    const credentials = await getFortnoxCredentials();
    if (!credentials || !credentials.accessToken) {
      console.error("No credentials available for token refresh");
      return false;
    }
    
    const success = await triggerSystemTokenRefresh(true);
    
    if (success) {
      console.log("Token refresh successful");
      
      const updatedCredentials = await getFortnoxCredentials();
      if (updatedCredentials && updatedCredentials.accessToken) {
        try {
          const tokenParts = updatedCredentials.accessToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              const expiresAt = new Date(payload.exp * 1000).toISOString();
              console.log(`Setting token expiration to: ${expiresAt}`);
              
              await saveFortnoxCredentials({
                ...updatedCredentials,
                expiresAt
              });
            }
          }
        } catch (parseError) {
          console.error("Error parsing JWT token:", parseError);
        }
      }
      
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
