
import { supabase } from "@/lib/supabase";
import { getFortnoxCredentials } from "./credentials";
import { refreshAccessToken } from "./auth"; // Changed import to import from auth.ts
import { toast } from "sonner";
import { RefreshResult } from "./types";

// Maximum number of retries for token refresh
const MAX_REFRESH_RETRIES = 2;

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
    
    // Define request headers
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': contentType,
      'Accept': 'application/json'
    };
    
    let requestBody = data;
    
    // Convert data to JSON if content type is application/json
    if (data && contentType === 'application/json') {
      requestBody = JSON.stringify(data);
    }
    
    // Make request to Fortnox API
    const response = await fetch(`https://api.fortnox.se/3/${endpoint}`, {
      method,
      headers,
      body: method !== 'GET' ? requestBody : undefined
    });
    
    // If token is expired (401), try to refresh and retry
    if (response.status === 401 && retryCount < MAX_REFRESH_RETRIES) {
      console.log("Received 401, attempting to refresh token");
      
      // If we have no refresh token, we can't refresh
      if (!credentials.refreshToken) {
        console.error("No refresh token available");
        toast.error("Fortnox authentication expired", {
          description: "Please reconnect to Fortnox from the settings page"
        });
        throw new Error("No refresh token available");
      }
      
      // Attempt to refresh the token
      const refreshResult: RefreshResult = await refreshAccessToken(
        credentials.clientId,
        credentials.clientSecret,
        credentials.refreshToken
      );
      
      if (refreshResult.success && refreshResult.credentials) {
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
    
    // For any other error status, throw an error
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fortnox API error ${response.status}:`, errorText);
      
      let errorMessage = `Fortnox API error ${response.status}`;
      
      try {
        // Try to parse error response
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.ErrorInformation?.message || errorJson.message || errorMessage;
      } catch (e) {
        // If parsing fails, use the raw error text
        errorMessage = errorText || errorMessage;
      }
      
      toast.error("Fortnox API error", {
        description: errorMessage.substring(0, 100)
      });
      
      throw new Error(errorMessage);
    }
    
    // Parse and return the response
    const responseData = await response.json();
    console.log("Fortnox API request successful");
    return responseData;
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
