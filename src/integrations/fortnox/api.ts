
import { supabase } from "@/lib/supabase";

// API endpoints for Fortnox
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';
const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Interface for Fortnox OAuth config
export interface FortnoxCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Interface for storing system settings
export interface SystemSettings {
  fortnoxCredentials?: FortnoxCredentials;
  appSettings?: {
    appName: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

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
      clientId: clientId ? `${clientId.substring(0, 3)}...` : undefined,
      redirectUri,
    });
    
    // Prepare the token request body according to Fortnox specs
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });
    
    // Log the request details for debugging
    console.log("Making token exchange request to:", FORTNOX_TOKEN_URL);
    console.log("Request body (without sensitive data):", 
      `grant_type=authorization_code&code=${code.substring(0, 5)}...&client_id=${clientId.substring(0, 3)}...&redirect_uri=${encodeURIComponent(redirectUri)}`);
    
    // Use a try-catch to catch network errors specifically
    try {
      const response = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenRequestBody,
      });

      console.log("Token exchange response status:", response.status);
      
      // Log the full response content for debugging
      const responseText = await response.text();
      console.log("Token exchange raw response:", responseText);
      
      // Parse the response as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(`Non-JSON response from Fortnox: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error("Token exchange failed:", response.status, responseData);
        
        // Enhanced error message with details from the response
        const errorDescription = responseData?.error_description || 
                                responseData?.message || 
                                'Unknown error from Fortnox API';
                                
        throw new Error(`Token exchange failed: ${errorDescription}`);
      }

      // At this point, responseData should contain the token information
      console.log("Token exchange successful, received tokens");
      
      // Calculate token expiration time
      const expiresAt = Date.now() + responseData.expires_in * 1000;
      
      return {
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token,
        expiresAt,
      };
      
    } catch (fetchError) {
      // This will catch network errors like CORS, failed to fetch, etc.
      console.error("Network error during token exchange:", fetchError);
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to Fortnox API'}`);
    }
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

/**
 * Save Fortnox credentials to the database
 */
export async function saveFortnoxCredentials(credentials: FortnoxCredentials): Promise<void> {
  try {
    // Convert credentials to a plain object to ensure it can be stored in JSON
    const credentialsObj = { ...credentials };
    
    // Prepare settings object with the credentials
    const settingsData = {
      credentials: credentialsObj
    };
    
    console.log("Saving Fortnox credentials to database");
    
    // First check if the table exists by trying to select
    const { data: checkData, error: checkError } = await supabase
      .from('system_settings')
      .select('id')
      .eq('id', 'fortnox')
      .maybeSingle();
      
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error("Error checking system_settings table:", checkError);
      throw new Error("Database error: " + checkError.message);
    }
    
    // Use upsert with type safety
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox',
        settings: settingsData as any
      });
      
    if (error) {
      console.error("Error saving Fortnox credentials:", error);
      throw error;
    }
    
    console.log("Fortnox credentials saved successfully");
  } catch (error) {
    console.error('Error saving Fortnox credentials:', error);
    throw error;
  }
}

/**
 * Get stored Fortnox credentials
 */
export async function getFortnoxCredentials(): Promise<FortnoxCredentials | null> {
  try {
    console.log("Fetching Fortnox credentials from database");
    
    // Direct query to get system settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox')
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching system settings:', error);
      return null;
    }
    
    if (!data || !data.settings) {
      console.log("No Fortnox credentials found in database");
      return null;
    }
    
    // Safe access with type assertions
    const settings = data.settings as any;
    const credentials = settings?.credentials;
    
    if (!credentials) {
      console.log("No credentials found in settings");
      return null;
    }
    
    return credentials as FortnoxCredentials;
  } catch (error) {
    console.error('Error getting Fortnox credentials:', error);
    return null;
  }
}

/**
 * Check if Fortnox integration is connected and tokens are valid
 */
export async function isFortnoxConnected(): Promise<boolean> {
  try {
    const credentials = await getFortnoxCredentials();
    
    if (!credentials || !credentials.accessToken) {
      console.log("Fortnox not connected: No credentials or access token");
      return false;
    }
    
    // Check if token is expired
    if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
      console.log("Fortnox token expired, attempting to refresh");
      
      // Token is expired, need to refresh
      if (!credentials.refreshToken) {
        console.log("No refresh token available");
        return false;
      }
      
      try {
        // Attempt to refresh the token
        const refreshed = await refreshAccessToken(
          credentials.clientId,
          credentials.clientSecret,
          credentials.refreshToken
        );
        
        // Save the refreshed tokens
        await saveFortnoxCredentials({
          ...credentials,
          ...refreshed,
        });
        
        console.log("Fortnox token refreshed successfully");
        return true;
      } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
      }
    }
    
    console.log("Fortnox connected with valid token");
    return true;
  } catch (error) {
    console.error("Error checking Fortnox connection:", error);
    return false;
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
    
    // Prepare the refresh token request body
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    
    console.log("Making refresh token request to:", FORTNOX_TOKEN_URL);
    
    try {
      const response = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenRequestBody,
      });

      console.log("Refresh token response status:", response.status);
      
      // Log the full response content for debugging
      const responseText = await response.text();
      
      // Parse the response as JSON if possible
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse refresh response as JSON:", parseError);
        throw new Error(`Non-JSON response from Fortnox during token refresh: ${responseText}`);
      }
      
      if (!response.ok) {
        console.error("Token refresh failed:", response.status, responseData);
        
        // Enhanced error message with details from the response
        const errorDescription = responseData?.error_description || 
                                responseData?.message || 
                                'Unknown error from Fortnox API';
                                
        throw new Error(`Token refresh failed: ${errorDescription}`);
      }

      // Calculate token expiration time
      const expiresAt = Date.now() + responseData.expires_in * 1000;
      
      return {
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token, // Fortnox may provide a new refresh token
        expiresAt,
      };
      
    } catch (fetchError) {
      // This will catch network errors like CORS, failed to fetch, etc.
      console.error("Network error during token refresh:", fetchError);
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to Fortnox API'}`);
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

/**
 * Disconnect Fortnox integration
 */
export async function disconnectFortnox(): Promise<void> {
  try {
    console.log("Disconnecting Fortnox integration");
    
    // Direct query to delete the system settings
    const { error } = await supabase
      .from('system_settings')
      .delete()
      .eq('id', 'fortnox');
      
    if (error) throw error;
    
    console.log("Fortnox disconnected successfully");
  } catch (error) {
    console.error('Error disconnecting Fortnox:', error);
    throw error;
  }
}

/**
 * Make an authenticated request to the Fortnox API
 */
export async function fortnoxApiRequest(
  endpoint: string, 
  method: string = 'GET', 
  data?: any
): Promise<any> {
  try {
    const credentials = await getFortnoxCredentials();
    
    if (!credentials || !credentials.accessToken) {
      throw new Error('Fortnox credentials not found');
    }
    
    // Check if token is expired and refresh if needed
    if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
      if (!credentials.refreshToken) {
        throw new Error('Refresh token not available');
      }
      
      const refreshed = await refreshAccessToken(
        credentials.clientId,
        credentials.clientSecret,
        credentials.refreshToken
      );
      
      // Save the refreshed tokens
      await saveFortnoxCredentials({
        ...credentials,
        ...refreshed,
      });
      
      // Update access token for the current request
      credentials.accessToken = refreshed.accessToken;
    }
    
    // Updated headers to match the requirements you provided
    const response = await fetch(`${FORTNOX_API_BASE}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Client-Secret': credentials.clientSecret, // Added as per documentation
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: "unknown", error_description: errorText };
      }
      
      console.error("Fortnox API request failed:", response.status, errorData);
      throw new Error(`Fortnox API Error: ${response.status} - ${errorData.error_description || errorData.message || errorText || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in Fortnox API request:', error);
    throw error;
  }
}

// New function to get specific Fortnox resources
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

// New function to create Fortnox resources
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

// New function to update Fortnox resources
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
