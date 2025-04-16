import { supabase } from "@/lib/supabase";
import { getFortnoxCredentials, saveFortnoxCredentials } from "./credentials";
import { refreshAccessToken } from "./auth";
import { environment } from '@/config/environment';

// API base URL for Fortnox
const FORTNOX_API_URL = environment.fortnox.apiUrl;

/**
 * Custom error interface for Fortnox API errors
 */
interface FortnoxApiError extends Error {
  response?: any;
}

/**
 * Make a request to the Fortnox API via our Edge Function proxy
 * @param endpoint The Fortnox API endpoint to call
 * @param method HTTP method to use
 * @param data Request body data (for POST/PUT requests)
 * @returns The response data from Fortnox
 */
export async function fortnoxApiRequest(
  endpoint: string,
  method: string = "GET",
  data?: any
) {
  try {
    // Ensure endpoint starts with a slash
    if (!endpoint.startsWith("/")) {
      endpoint = `/${endpoint}`;
    }
    
    // Prepare the request options with proper content type for UTF-8 support
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
      },
    };
    
    // Add request body for non-GET requests
    if (method !== "GET" && data) {
      options.body = JSON.stringify(data);
    }
    
    // Make the request to our Edge Function
    const response = await fetch(`/api/fortnox-proxy${endpoint}`, options);
    
    // Handle various response types
    const contentType = response.headers.get("content-type");
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fortnox API error:", errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        throw errorJson;
      } catch (e) {
        throw new Error(`Fortnox API error: ${errorText}`);
      }
    }
    
    // Try to parse JSON response, but fall back to text if it's not JSON
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error("Error making Fortnox API request:", error);
    throw error;
  }
}

// Helper functions for common API operations

/**
 * Get specific Fortnox resources
 */
export async function getFortnoxResource(
  resource: string,
  id?: string,
  queryParams?: Record<string, string>
): Promise<any> {
  try {
    let endpoint = `/${resource}`;
    
    // Add ID if provided
    if (id) {
      endpoint += `/${id}`;
    }
    
    // Add query parameters if provided
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value);
      });
      endpoint += `?${params.toString()}`;
    }
    
    return await fortnoxApiRequest(endpoint, 'GET');
  } catch (error) {
    console.error(`Error fetching Fortnox ${resource}:`, error);
    throw error;
  }
}

/**
 * Create Fortnox resources
 */
export async function createFortnoxResource(
  resource: string,
  data: any
): Promise<any> {
  try {
    return await fortnoxApiRequest(`/${resource}`, 'POST', data);
  } catch (error) {
    console.error(`Error creating Fortnox ${resource}:`, error);
    throw error;
  }
}

/**
 * Update Fortnox resources
 */
export async function updateFortnoxResource(
  resource: string,
  id: string,
  data: any
): Promise<any> {
  try {
    return await fortnoxApiRequest(`/${resource}/${id}`, 'PUT', data);
  } catch (error) {
    console.error(`Error updating Fortnox ${resource}:`, error);
    throw error;
  }
}
