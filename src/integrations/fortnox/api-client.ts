
import { supabase } from "@/lib/supabase";
import { getFortnoxCredentials } from "./credentials";
import { refreshAccessToken } from "./auth";
import { toast } from "sonner";
import { RefreshResult } from "./types";
import { getRedirectUri } from "@/config/environment";

// Maximum number of retries for token refresh
const MAX_REFRESH_RETRIES = 2;

/**
 * Checks if the token is about to expire (less than 5 minutes remaining)
 */
function isTokenAboutToExpire(token: string): boolean {
  try {
    // JWT tokens consist of three parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true; // If not valid JWT format, consider it about to expire
    
    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true; // If no expiration, consider it about to expire
    
    // Check if token expires in less than 5 minutes
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    return timeUntilExpiry < fiveMinutesInMs;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // On error, consider token about to expire
  }
}

/**
 * Make a request to the Fortnox API with automatic token refresh
 */
export async function fortnoxApiRequest(
  endpoint: string,
  method: string = 'GET',
  data?: any,
  contentType: string = 'application/json',
  retryCount: number = 0
): Promise<any> {
  try {
    console.log(`Making ${method} request to Fortnox API: ${endpoint}`);
    
    // Get Fortnox credentials
    const credentials = await getFortnoxCredentials();
    
    // If no credentials, prompt user to connect
    if (!credentials || !credentials.accessToken) {
      console.log("No valid Fortnox credentials found");
      toast.error("Fortnox integration not connected", {
        description: "Please connect to Fortnox from the settings page"
      });
      throw new Error("No valid Fortnox credentials found");
    }
    
    // Check if token is about to expire and needs refreshing before making the request
    if (isTokenAboutToExpire(credentials.accessToken) && retryCount < MAX_REFRESH_RETRIES) {
      console.log("Access token is about to expire, refreshing proactively");
      
      // If we have no refresh token, we can't refresh
      if (!credentials.refreshToken) {
        console.error("No refresh token available");
        toast.error("Fortnox authentication expired", {
          description: "Please reconnect to Fortnox from the settings page"
        });
        throw new Error("No refresh token available");
      }
      
      // Get redirect URI
      const redirectUri = getRedirectUri();
      
      // Attempt to refresh the token
      const refreshResult: RefreshResult = await refreshAccessToken(
        credentials.refreshToken,
        credentials.clientId,
        credentials.clientSecret,
        redirectUri
      );
      
      if (refreshResult.success && refreshResult.accessToken) {
        console.log("Token refresh successful, continuing with request");
        return fortnoxApiRequest(endpoint, method, data, contentType, retryCount + 1);
      } else {
        console.error("Proactive token refresh failed:", refreshResult.message);
        // Continue with request using existing token
      }
    }
    
    // Use the Edge Function proxy to avoid CORS issues
    const { data: responseData, error } = await supabase.functions.invoke('fortnox-proxy', {
      body: JSON.stringify({
        endpoint,
        method,
        data,
        contentType,
        accessToken: credentials.accessToken
      })
    });
    
    if (error) {
      console.error("Edge Function error:", error);
      
      // If the error is due to an expired token, try to refresh it
      if (error.message && (error.message.includes("401") || error.message.includes("unauthorized") || error.message.includes("expired"))) {
        if (retryCount < MAX_REFRESH_RETRIES) {
          console.log("Received 401, attempting to refresh token");
          
          // If we have no refresh token, we can't refresh
          if (!credentials.refreshToken) {
            console.error("No refresh token available");
            toast.error("Fortnox authentication expired", {
              description: "Please reconnect to Fortnox from the settings page"
            });
            throw new Error("No refresh token available");
          }
          
          // Get redirect URI
          const redirectUri = getRedirectUri();
          
          // Attempt to refresh the token
          const refreshResult: RefreshResult = await refreshAccessToken(
            credentials.refreshToken,
            credentials.clientId,
            credentials.clientSecret,
            redirectUri
          );
          
          if (refreshResult.success && refreshResult.accessToken) {
            console.log("Token refresh successful, retrying request");
            
            // Retry the request with the new token
            return fortnoxApiRequest(endpoint, method, data, contentType, retryCount + 1);
          } else {
            console.error("Token refresh failed:", refreshResult.message);
            
            // If the refresh token is invalid, prompt user to reconnect
            if (refreshResult.requiresReconnect) {
              toast.error("Fortnox connection needs to be reestablished", {
                description: "Please reconnect to Fortnox from the settings page"
              });
            } else {
              toast.error("Failed to refresh Fortnox authentication", {
                description: refreshResult.message
              });
            }
            
            throw new Error(`Token refresh failed: ${refreshResult.message}`);
          }
        }
      }
      
      // Handle Edge Function error
      let errorMessage = error.message || "Unknown error";
      
      // Try to parse nested error message if available
      try {
        if (typeof error.message === 'string' && error.message.includes('{')) {
          const errorJson = JSON.parse(error.message.substring(error.message.indexOf('{')));
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        }
      } catch (e) {
        // If parsing fails, use the original error message
      }
      
      toast.error("Fortnox API error", {
        description: errorMessage.substring(0, 100)
      });
      
      throw new Error(errorMessage);
    }
    
    // If there's an application-level error in the response
    if (responseData.error) {
      console.error("Fortnox API error:", responseData.error);
      
      let errorMessage = responseData.error;
      if (responseData.details) {
        errorMessage += `: ${responseData.details}`;
      }
      
      toast.error("Fortnox API error", {
        description: errorMessage.substring(0, 100)
      });
      
      throw new Error(errorMessage);
    }
    
    // Return the response data
    console.log("Fortnox API request successful");
    return responseData.data;
  } catch (error) {
    console.error("Error in Fortnox API request:", error);
    throw error;
  }
}

// Helper functions for common API operations
export async function getFortnoxResource(resource: string, id?: string): Promise<any> {
  const endpoint = id ? `${resource}/${id}` : resource;
  return fortnoxApiRequest(endpoint, 'GET');
}

export async function createFortnoxResource(resource: string, data: any): Promise<any> {
  return fortnoxApiRequest(resource, 'POST', data);
}

export async function updateFortnoxResource(resource: string, id: string, data: any): Promise<any> {
  return fortnoxApiRequest(`${resource}/${id}`, 'PUT', data);
}
