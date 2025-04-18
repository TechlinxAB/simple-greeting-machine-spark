
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_MIGRATION_URL = 'https://apps.fortnox.se/oauth-v1/migrate';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Received token migration request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed migration request data:", {
        hasClientId: Boolean(requestData.client_id),
        hasClientSecret: Boolean(requestData.client_secret),
        hasAccessToken: Boolean(requestData.access_token),
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
    if (!requestData.client_id || !requestData.client_secret || !requestData.access_token) {
      const missingFields = [];
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      if (!requestData.access_token) missingFields.push('access_token');
      
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
    formData.append('access_token', requestData.access_token);
    
    // Add additional parameters for JWT token migration
    formData.append('auth_flow', 'authorization_code_grant');
    formData.append('token_type_hint', 'jwt');
    
    console.log("Making migration request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_MIGRATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: formData.toString(),
    });
    
    // Read the response as text
    const responseText = await response.text();
    
    console.log("Fortnox migration response status:", response.status);
    
    // Try to parse the response as JSON
    let responseData;
    
    try {
      // Only attempt to parse as JSON if the content appears to be JSON
      if (responseText && (
          response.headers.get('content-type')?.includes('application/json') ||
          (responseText.trim().startsWith('{') && responseText.trim().endsWith('}'))
      )) {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed migration response as JSON");
      } else {
        console.error("Fortnox migration response is not JSON:", responseText);
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
      console.error("Failed to parse Fortnox migration response:", e);
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
      
      console.error("Fortnox API migration error:", {
        status: errorStatus,
        error: responseData.error || "unknown_error",
        description: responseData.error_description || "Unknown error"
      });
      
      // Handle specific migration errors
      if (response.status === 404 || responseData.error === 'token_not_found') {
        return new Response(
          JSON.stringify({ 
            error: "token_not_found", 
            error_description: "Access-token not found or has expired",
            fortnox_error: responseData 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      if (response.status === 403) {
        if (responseData.error === 'jwt_creation_not_allowed') {
          return new Response(
            JSON.stringify({ 
              error: "jwt_creation_not_allowed", 
              error_description: "Not allowed to create JWT for given access-token",
              fortnox_error: responseData 
            }),
            { 
              status: 403, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        if (responseData.error === 'jwt_creation_failed') {
          return new Response(
            JSON.stringify({ 
              error: "jwt_creation_failed", 
              error_description: "Could not create JWT",
              fortnox_error: responseData 
            }),
            { 
              status: 403, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
      
      if (response.status === 400 && responseData.error === 'incorrect_auth_flow') {
        return new Response(
          JSON.stringify({ 
            error: "incorrect_auth_flow", 
            error_description: "Could not create JWT, due to incorrect auth flow type",
            fortnox_error: responseData 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      if (response.status === 401 || responseData.error === 'invalid_client') {
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
    
    console.log("Fortnox token migration successful");
    
    // Return the successful migration response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Server error in token-migration:", error);
    
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
