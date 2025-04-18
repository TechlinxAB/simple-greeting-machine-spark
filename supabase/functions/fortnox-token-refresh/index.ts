
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    console.log("Handling CORS preflight request");
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
      console.log("Parsed request data successfully", {
        hasRefreshToken: !!requestData.refresh_token,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        grant_type: requestData.grant_type || "not specified"
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
    if (!requestData.client_id || !requestData.client_secret || !requestData.refresh_token) {
      const missingFields = [];
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      if (!requestData.refresh_token) missingFields.push('refresh_token');
      
      console.error(`Missing required parameters: ${missingFields.join(', ')}`);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_request",
          error_description: "Missing required parameters",
          details: {
            missing: missingFields,
            client_id: requestData.client_id ? "present" : "missing",
            client_secret: requestData.client_secret ? "present" : "missing",
            refresh_token: requestData.refresh_token ? "present" : "missing"
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Additional validation for parameter lengths
    if (requestData.client_id.length < 5) {
      console.error("Client ID appears to be too short", { length: requestData.client_id.length });
      return new Response(
        JSON.stringify({ 
          error: "invalid_client_id",
          error_description: "Client ID appears to be too short or invalid"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (requestData.client_secret.length < 5) {
      console.error("Client secret appears to be too short", { length: requestData.client_secret.length });
      return new Response(
        JSON.stringify({ 
          error: "invalid_client_secret",
          error_description: "Client secret appears to be too short or invalid"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (requestData.refresh_token.length < 5) {
      console.error("Refresh token appears to be too short", { length: requestData.refresh_token.length });
      return new Response(
        JSON.stringify({ 
          error: "invalid_refresh_token",
          error_description: "Refresh token appears to be too short or invalid"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Prepare the form data
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: requestData.client_id,
      client_secret: requestData.client_secret,
      refresh_token: requestData.refresh_token,
    });
    
    console.log("Making token refresh request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    
    try {
      if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed Fortnox response as JSON");
      } else {
        console.error("Failed to parse Fortnox response as JSON, raw response:", responseText);
        return new Response(
          JSON.stringify({ 
            error: "invalid_response_format", 
            error_description: "Failed to parse Fortnox response", 
            raw_response: responseText 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "parse_error", 
          error_description: "Failed to parse Fortnox response", 
          raw_response: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If the response is not OK, or contains an error field, return the error
    if (!response.ok || responseData.error) {
      const errorStatus = response.status || 400;
      console.error("Fortnox API error:", errorStatus, responseData);
      
      return new Response(
        JSON.stringify({ 
          error: responseData.error || "fortnox_api_error", 
          error_description: responseData.error_description || "Fortnox API error",
          status: errorStatus,
          details: responseData
        }),
        { 
          status: errorStatus, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Verify we have the required tokens
    if (!responseData.access_token) {
      console.error("Fortnox response missing access_token:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "invalid_response", 
          error_description: "Fortnox response missing access_token" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Token refresh successful, returning response");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-refresh:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        error_description: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
