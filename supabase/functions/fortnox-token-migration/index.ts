
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_MIGRATION_URL = 'https://apps.fortnox.se/oauth-v1/migrate';

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
    console.log("Received token migration request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed request data successfully", {
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasAccessToken: !!requestData.access_token
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "invalid_request", error_description: "Invalid request body - could not parse JSON" }),
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
          details: {
            missing: missingFields,
            client_id: requestData.client_id ? "present" : "missing",
            client_secret: requestData.client_secret ? "present" : "missing",
            access_token: requestData.access_token ? "present" : "missing"
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Additional validation
    if (requestData.client_id.length < 5 || requestData.client_secret.length < 5 || requestData.access_token.length < 5) {
      console.error("One or more parameters appear to be too short");
      return new Response(
        JSON.stringify({ 
          error: "invalid_parameters",
          error_description: "One or more parameters appear to be too short or invalid"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create Basic Auth header from client_id and client_secret
    const credentials = `${requestData.client_id}:${requestData.client_secret}`;
    const base64Credentials = btoa(credentials);
    const authHeader = `Basic ${base64Credentials}`;
    
    // Prepare the form data for migration
    const formData = new URLSearchParams();
    formData.append('access_token', requestData.access_token);
    
    console.log("Making token migration request to Fortnox");
    console.log("Form data:", formData.toString());
    console.log("Using authorization header with length:", authHeader.length);
    
    // Make the request to Fortnox with full error logging
    const response = await fetch(FORTNOX_MIGRATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: formData.toString(),
    });
    
    // Get the response body as text first
    const responseText = await response.text();
    console.log("Fortnox migration response status:", response.status);
    console.log("Fortnox migration response body:", responseText);
    
    // If the response is not OK, return the appropriate error based on Fortnox error types
    if (!response.ok) {
      // Try to parse response as JSON if possible
      let errorData = null;
      let errorMessage = responseText;
      
      try {
        if (responseText.includes('{') && responseText.includes('}')) {
          // Extract JSON part if embedded in text
          const jsonStart = responseText.indexOf('{');
          const jsonEnd = responseText.lastIndexOf('}') + 1;
          const jsonPart = responseText.substring(jsonStart, jsonEnd);
          errorData = JSON.parse(jsonPart);
        } else if (responseText.trim().startsWith('{')) {
          // Direct JSON response
          errorData = JSON.parse(responseText);
        }
      } catch (e) {
        console.error("Failed to parse error response as JSON:", e);
      }
      
      // Handle specific Fortnox error scenarios
      if (response.status === 401) {
        return new Response(
          JSON.stringify({
            error: "invalid_client",
            error_description: "Invalid authorization credentials",
            details: { raw_response: responseText }
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      } else if (response.status === 400) {
        // Process known 400 error types
        if (responseText.includes("Invalid access-token")) {
          return new Response(
            JSON.stringify({
              error: "invalid_token",
              error_description: "The provided access token is invalid",
              details: { raw_response: responseText }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        if (responseText.includes("Could not create JWT")) {
          return new Response(
            JSON.stringify({
              error: "jwt_creation_failed",
              error_description: "Could not create JWT token",
              details: { raw_response: responseText }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        if (responseText.includes("incorrect auth flow type")) {
          return new Response(
            JSON.stringify({
              error: "incorrect_auth_flow",
              error_description: "Could not create JWT, due to incorrect auth flow type",
              details: { raw_response: responseText }
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      } else if (response.status === 403) {
        if (responseText.includes("Not allowed to create JWT")) {
          const isMissingLicense = responseText.includes("missing license");
          
          return new Response(
            JSON.stringify({
              error: "jwt_creation_not_allowed",
              error_description: isMissingLicense 
                ? "Not allowed to create JWT, due to missing license" 
                : "Not allowed to create JWT for the given access-token",
              details: { raw_response: responseText }
            }),
            { 
              status: 403, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      } else if (response.status === 404) {
        if (responseText.includes("Access-token not found")) {
          return new Response(
            JSON.stringify({
              error: "token_not_found",
              error_description: "The provided access token was not found",
              details: { raw_response: responseText }
            }),
            { 
              status: 404, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
      
      // Generic error response if none of the specific cases matched
      return new Response(
        JSON.stringify({ 
          error: errorData?.error || "fortnox_api_error", 
          error_description: errorMessage,
          status: response.status,
          details: { raw_response: responseText }
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Parse the successful response
    let responseData;
    try {
      // Check if the response is JSON
      if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed Fortnox response as JSON");
      } else {
        // If not JSON, wrap the text in a simple object
        console.error("Fortnox response is not JSON:", responseText);
        return new Response(
          JSON.stringify({ 
            error: "invalid_response_format", 
            error_description: "Fortnox returned a non-JSON response", 
            raw_response: responseText 
          }),
          { 
            status: 400, 
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
    
    // Check for required fields in successful response
    if (!responseData.access_token || !responseData.refresh_token) {
      console.error("Fortnox response missing required fields:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "invalid_response", 
          error_description: "Fortnox response missing required token fields",
          details: responseData
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Token migration successful");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-migration:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        error_description: error.message || "Unknown error",
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
