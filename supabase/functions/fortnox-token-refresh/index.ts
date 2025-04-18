
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request for token refresh");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Received token refresh request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed refresh request data:", {
        hasRefreshToken: Boolean(requestData.refresh_token),
        refreshTokenLength: requestData.refresh_token?.length || 0,
        hasClientId: Boolean(requestData.client_id),
        hasClientSecret: Boolean(requestData.client_secret)
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ 
          error: "invalid_request", 
          error_description: "Invalid request body - could not parse JSON" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate required fields
    if (!requestData.refresh_token || !requestData.client_id || !requestData.client_secret) {
      const missingFields = [];
      if (!requestData.refresh_token) missingFields.push('refresh_token');
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      
      console.error(`Missing required parameters: ${missingFields.join(', ')}`);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_request", 
          error_description: "Missing required parameters", 
          missing_fields: missingFields
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create the Basic Authorization header from client_id and client_secret
    const credentials = btoa(`${requestData.client_id}:${requestData.client_secret}`);
    
    // Create form data for the Fortnox API request
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', requestData.refresh_token);
    
    // Add additional parameters for JWT token compatibility
    formData.append('auth_flow', 'authorization_code_grant');
    formData.append('token_type_hint', 'jwt');
    
    console.log("Making refresh request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: formData.toString(),
    });
    
    // Read the response as text
    const responseText = await response.text();
    
    console.log("Fortnox refresh response status:", response.status);
    
    // Try to parse the response as JSON
    let responseData;
    
    try {
      // Only attempt to parse as JSON if the content appears to be JSON
      if (responseText && (
          response.headers.get('content-type')?.includes('application/json') ||
          (responseText.trim().startsWith('{') && responseText.trim().endsWith('}'))
      )) {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed refresh response as JSON");
      } else {
        console.error("Fortnox refresh response is not JSON:", responseText);
        return new Response(
          JSON.stringify({ 
            error: "invalid_response_format", 
            error_description: "Fortnox returned a non-JSON response", 
            raw_response: responseText 
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } catch (e) {
      console.error("Failed to parse Fortnox refresh response:", e);
      console.error("Raw response:", responseText);
      
      return new Response(
        JSON.stringify({ 
          error: "parse_error", 
          error_description: "Failed to parse Fortnox response", 
          raw_response: responseText 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Handle error responses from Fortnox
    if (!response.ok || responseData.error) {
      const errorStatus = response.status;
      
      console.error("Fortnox API refresh error:", {
        status: errorStatus,
        error: responseData.error || "unknown_error",
        description: responseData.error_description || "Unknown error"
      });
      
      // Handle specific refresh errors
      if (responseData.error === 'invalid_grant') {
        return new Response(
          JSON.stringify({ 
            error: "invalid_grant", 
            error_description: "Refresh token is invalid or has expired",
            fortnox_error: responseData,
            requires_reconnect: true
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      if (responseData.error === 'invalid_client') {
        return new Response(
          JSON.stringify({ 
            error: "invalid_client", 
            error_description: "Invalid client credentials (client ID or client secret)",
            fortnox_error: responseData 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      if (responseData.error === 'incorrect_auth_flow') {
        return new Response(
          JSON.stringify({ 
            error: "incorrect_auth_flow", 
            error_description: "Could not refresh token, due to incorrect auth flow type",
            fortnox_error: responseData 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: responseData.error || "fortnox_api_error", 
          error_description: responseData.error_description || "Fortnox API error",
          status: errorStatus,
          fortnox_error: responseData 
        }),
        { 
          status: response.status || 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Verify required tokens are present in successful response
    if (!responseData.access_token || !responseData.refresh_token) {
      console.error("Fortnox response missing tokens:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "invalid_response", 
          error_description: "Fortnox response missing required tokens" 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Fortnox token refresh successful");
    
    // Return the successful refresh response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Server error in token-refresh:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        error_description: error.message || "Unknown server error",
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
