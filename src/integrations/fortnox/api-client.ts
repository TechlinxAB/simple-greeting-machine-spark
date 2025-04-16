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
    
    // Special handling for article creation - preserve ArticleNumber
    if (method === 'POST' && path.includes('/articles') && data) {
      // Make sure we don't remove ArticleNumber during article creation
      console.log("Creating article with data:", JSON.stringify(data, null, 2));
      if (data.Article && data.Article.ArticleNumber) {
        console.log(`Preserving original ArticleNumber: ${data.Article.ArticleNumber}`);
      }
    }
    
    // Special handling for invoice creation - preserve ArticleNumber in rows
    if (method === 'POST' && path.includes('/invoices') && data && !retryWithoutArticleNumber) {
      // Sanitize invoice data before sending
      if (data.Invoice) {
        // Remove EmailInformation if it exists
        if (data.Invoice.EmailInformation) {
          console.log("Removing EmailInformation from invoice data");
          delete data.Invoice.EmailInformation;
        }
        
        // Validate invoice rows but preserve ArticleNumber
        if (data.Invoice.InvoiceRows && Array.isArray(data.Invoice.InvoiceRows)) {
          console.log("Validating invoice rows while preserving ArticleNumber");
          data.Invoice.InvoiceRows = data.Invoice.InvoiceRows.map(row => {
            // Ensure VAT is one of the allowed values
            if (!row.VAT || ![25, 12, 6].includes(row.VAT)) {
              row.VAT = 25; // Default to 25%
            }
            
            // Ensure AccountNumber is in valid range
            const accountNum = parseInt(row.AccountNumber);
            if (isNaN(accountNum) || accountNum < 3000 || accountNum > 3999) {
              row.AccountNumber = "3001"; // Default to 3001
            }
            
            // Preserve ArticleNumber - no validation needed as we trust the original article number
            if (row.ArticleNumber) {
              console.log(`Preserving ArticleNumber in invoice row: ${row.ArticleNumber}`);
            }
            
            return row;
          });
        }
      }
    }
    
    // Debug: Log the sanitized payload for POST/PUT
    if (method !== 'GET' && data) {
      console.log("Sanitized request payload:", JSON.stringify(data, null, 2));
    }
    
    // Prepare the request body for the edge function
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
      
      // Add article details to the error so we can automatically create it
      if (errorDetails && errorDetails.articleDetails) {
        const articleDetails = errorDetails.articleDetails;
        console.log("Found article details in error, can be used to auto-create:", articleDetails);
      }
      
      // Throw a nicely formatted error with all the details we have
      const formattedError = new Error(`${errorMessage}: ${JSON.stringify(errorDetails || error.message || 'Unknown error')}`) as FortnoxApiError;
      formattedError.response = errorDetails;
      throw formattedError;
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
