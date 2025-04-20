
import { supabase } from "@/lib/supabase";
import { getFortnoxCredentials } from "./credentials";
import { refreshAccessToken } from "./auth";
import { toast } from "sonner";
import { RefreshResult } from "./types";
import { getRedirectUri } from "@/config/environment";

// Maximum number of retries for token refresh
const MAX_REFRESH_RETRIES = 3;
// Safety buffer - refresh token if less than 15 minutes to expiry
const TOKEN_REFRESH_BUFFER_MINUTES = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Checks if the token is about to expire (less than buffer time remaining)
 */
function isTokenAboutToExpire(token: string): boolean {
  try {
    // JWT tokens consist of three parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true; // If not valid JWT format, consider it about to expire
    
    // Decode the payload
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true; // If no expiration, consider it about to expire
    
    // Check if token expires in less than buffer time
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;
    
    return timeUntilExpiry < TOKEN_REFRESH_BUFFER_MINUTES;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // On error, consider token about to expire
  }
}

/**
 * Check if token is already expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;
    
    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    
    return now >= expirationTime;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // On error, assume token is expired
  }
}

/**
 * Force refresh the token by calling the Edge Function directly
 * This will be called automatically when the token is expired
 */
async function forceTokenRefresh(): Promise<boolean> {
  try {
    // Call the scheduled refresh function with force=true
    const { data, error } = await supabase.functions.invoke('fortnox-scheduled-refresh', {
      body: JSON.stringify({ force: true, automatic: true }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.error("Error invoking token refresh function:", error);
      return false;
    }
    
    if (data && data.success) {
      console.log("Automatic token refresh successful:", data);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Exception in force token refresh:", error);
    return false;
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
      
      // Try to refresh the token automatically before giving up
      if (retryCount === 0) {
        console.log("Attempting automatic token refresh");
        const refreshSuccess = await forceTokenRefresh();
        
        if (refreshSuccess) {
          // If successful, retry the request
          return fortnoxApiRequest(endpoint, method, data, contentType, retryCount + 1);
        }
      }
      
      // Only show toast if we're in a browser context (not during SSR)
      if (typeof window !== 'undefined') {
        toast.error("Fortnox integration not connected", {
          description: "Please connect to Fortnox from the settings page"
        });
      }
      
      throw new Error("No valid Fortnox credentials found");
    }
    
    // Check if token is expired and needs immediate refresh
    if (isTokenExpired(credentials.accessToken)) {
      console.log("Access token is EXPIRED, forcing immediate refresh");
      
      // Call the Edge Function to refresh the token
      const refreshSuccess = await forceTokenRefresh();
      
      if (refreshSuccess) {
        // Retry the request with fresh credentials
        console.log("Automatic token refresh successful, retrying request");
        return fortnoxApiRequest(endpoint, method, data, contentType, retryCount + 1);
      } else {
        console.error("Automatic token refresh failed for expired token");
        
        // Only show toast if we're in a browser context (not during SSR)
        if (typeof window !== 'undefined') {
          toast.error("Failed to refresh expired token", {
            description: "System will continue to attempt automatic refresh"
          });
        }
      }
    }
    
    // Check if token is about to expire and needs refreshing before making the request
    if (isTokenAboutToExpire(credentials.accessToken) && retryCount < MAX_REFRESH_RETRIES) {
      console.log("Access token is about to expire, refreshing proactively");
      
      // Call the Edge Function to refresh the token
      const refreshSuccess = await forceTokenRefresh();
      
      if (refreshSuccess) {
        // Retry the request with fresh credentials
        console.log("Proactive token refresh successful, retrying request");
        return fortnoxApiRequest(endpoint, method, data, contentType, retryCount + 1);
      } else {
        console.log("Proactive refresh failed, continuing with current token");
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
          console.log("Received 401, attempting automatic token refresh");
          
          // Force refresh the token
          const refreshSuccess = await forceTokenRefresh();
          
          if (refreshSuccess) {
            console.log("Token refresh successful after 401, retrying request");
            // Retry the request with the new token
            return fortnoxApiRequest(endpoint, method, data, contentType, retryCount + 1);
          } else {
            console.error("Token refresh failed after 401");
            
            // Only show toast if we're in a browser context (not during SSR)
            if (typeof window !== 'undefined') {
              toast.error("Fortnox authentication failed", {
                description: "System will continue to attempt automatic refresh"
              });
            }
            
            throw new Error(`Failed to refresh token after 401: ${error.message}`);
          }
        } else {
          console.error(`Exceeded maximum retry count (${MAX_REFRESH_RETRIES}) for token refresh`);
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
      
      // Only show toast if we're in a browser context (not during SSR)
      if (typeof window !== 'undefined') {
        toast.error("Fortnox API error", {
          description: errorMessage.substring(0, 100)
        });
      }
      
      throw new Error(errorMessage);
    }
    
    // If there's an application-level error in the response
    if (responseData.error) {
      console.error("Fortnox API error:", responseData.error);
      
      let errorMessage = responseData.error;
      if (responseData.details) {
        errorMessage += `: ${responseData.details}`;
      }
      
      // Only show toast if we're in a browser context (not during SSR)
      if (typeof window !== 'undefined') {
        toast.error("Fortnox API error", {
          description: errorMessage.substring(0, 100)
        });
      }
      
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
