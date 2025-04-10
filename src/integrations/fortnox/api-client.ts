import { supabase } from "@/lib/supabase";
import { getFortnoxCredentials, saveFortnoxCredentials } from "./credentials";
import { refreshAccessToken } from "./auth";

// API base URL for Fortnox
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

/**
 * Make an authenticated request to the Fortnox API
 */
export async function fortnoxApiRequest(
  endpoint: string, 
  method: string = 'GET', 
  data?: any,
  retryWithoutArticleNumber: boolean = false
): Promise<any> {
  try {
    // Get the Fortnox credentials from the database
    const credentials = await getFortnoxCredentials();
    
    if (!credentials || !credentials.accessToken) {
      throw new Error('Fortnox credentials not found or missing access token');
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
    
    // Log the request details
    console.log(`Making ${method} request to Fortnox endpoint: ${endpoint}`);
    console.log("Using access token:", credentials.accessToken?.substring(0, 10) + "...");
    console.log("Using client secret:", credentials.clientSecret?.substring(0, 5) + "...");

    // Format endpoint to ensure it starts with a slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Prepare the request body for the edge function
    // IMPORTANT: We need to include the headers explicitly in the body
    const requestBody = {
      method,
      path,
      payload: data,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Client-Secret': credentials.clientSecret
      }
    };
    
    console.log("Sending request to fortnox-proxy with body:", {
      method: requestBody.method,
      path: requestBody.path,
      hasPayload: !!requestBody.payload,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken?.substring(0, 5)}...`,
        'Client-Secret': `${credentials.clientSecret?.substring(0, 5)}...`
      }
    });
    
    // Add debug logging for the exact payload for POST/PUT
    if (method !== 'GET' && data) {
      console.log("Request payload:", JSON.stringify(data, null, 2));
    }
    
    // Call the edge function with the properly structured request body
    const { data: responseData, error } = await supabase.functions.invoke('fortnox-proxy', {
      body: requestBody
    });
    
    if (error) {
      console.error("❌ Edge Function error:", error.message, error);
      
      // Try to extract more detailed error information
      let errorMessage = "Fortnox API Error";
      let errorDetails = null;
      let errorCode = null;
      
      if (typeof error === 'object' && error !== null) {
        // If the error contains a message that has JSON in it, parse it
        if (error.message && typeof error.message === 'string') {
          try {
            if (error.message.includes('{') && error.message.includes('}')) {
              const jsonStart = error.message.indexOf('{');
              const jsonEnd = error.message.lastIndexOf('}') + 1;
              
              if (jsonStart >= 0 && jsonEnd > jsonStart) {
                errorDetails = JSON.parse(error.message.substring(jsonStart, jsonEnd));
                if (errorDetails?.error) {
                  errorMessage = `Fortnox API Error: ${errorDetails.error}`;
                }
                if (errorDetails?.details) {
                  errorDetails = errorDetails.details;
                }
                if (errorDetails?.errorCode) {
                  errorCode = errorDetails.errorCode;
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing error message JSON:", parseError);
          }
        }
      }
      
      // Implement retry logic for article number issues
      // Check if this is a POST to /invoices and if we haven't retried yet
      if (
        method === 'POST' && 
        endpoint.includes('/invoices') && 
        !retryWithoutArticleNumber && 
        data?.Invoice?.InvoiceRows
      ) {
        // Check if error is related to article number
        const isArticleNumberError = 
          errorMessage.includes("ArticleNumber") || 
          errorCode === "2001204" || // ArticleNumber doesn't exist
          errorCode === "2001008";   // Article not found
          
        if (isArticleNumberError) {
          console.log("⚠️ Article number error detected, retrying without article numbers");
          
          // Create a deep copy of the original data
          const retryData = JSON.parse(JSON.stringify(data));
          
          // Modify each invoice row to remove ArticleNumber
          if (retryData.Invoice && retryData.Invoice.InvoiceRows) {
            retryData.Invoice.InvoiceRows = retryData.Invoice.InvoiceRows.map((row: any) => {
              // Remove ArticleNumber and UnitCode but keep other fields
              const { ArticleNumber, UnitCode, ...rest } = row;
              return rest;
            });
          }
          
          console.log("Retrying with modified payload:", JSON.stringify(retryData, null, 2));
          
          // Retry the request with the modified data
          return await fortnoxApiRequest(endpoint, method, retryData, true);
        }
      }
      
      // Throw a nicely formatted error
      throw new Error(`${errorMessage}: ${JSON.stringify(errorDetails || error.message || 'Unknown error')}`);
    }
    
    // Handle case where data contains an error object from Fortnox
    if (!responseData) {
      throw new Error('Empty response from Fortnox API');
    }
    
    // Check if the response contains a Fortnox error
    if (responseData.error || responseData.ErrorInformation) {
      console.error("❌ Fortnox API returned error:", responseData);
      
      const errorMessage = 
        responseData.error?.message || 
        responseData.ErrorInformation?.message || 
        responseData.error || 
        'Unknown Fortnox error';
      
      throw new Error(`Fortnox API Error: ${errorMessage}`);
    }
    
    console.log("✅ Fortnox API Success:", responseData);
    return responseData;
  } catch (error) {
    console.error('Error in Fortnox API request:', error);
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
