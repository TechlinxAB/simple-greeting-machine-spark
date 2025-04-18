
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
        JSON.stringify({ error: "Invalid request body - could not parse JSON" }),
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
          error: "Missing required parameters",
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
    
    // Log migration attempt (with masked sensitive data)
    console.log("Migration attempt with:", {
      clientIdLength: requestData.client_id.length,
      clientSecretLength: requestData.client_secret.length,
      accessTokenLength: requestData.access_token.length
    });
    
    // Create Basic Auth header from client_id and client_secret
    const credentials = `${requestData.client_id}:${requestData.client_secret}`;
    const base64Credentials = btoa(credentials);
    const authHeader = `Basic ${base64Credentials}`;
    
    // Prepare the form data for migration
    const formData = new URLSearchParams();
    formData.append('access_token', requestData.access_token);
    
    console.log("Making token migration request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_MIGRATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: formData.toString(), // Use toString() to properly format the URLSearchParams
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox migration response status:", response.status);
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox returned an error:", response.status, responseText);
      
      // Check if the response is "Invalid access-token" which is a common error
      if (responseText.includes("Invalid access-token")) {
        return new Response(
          JSON.stringify({
            error: "invalid_token",
            error_description: "The provided access token is invalid or has expired",
            status: response.status,
            details: responseText
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Try to parse as JSON if it looks like JSON
      let errorData = null;
      if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // If it fails to parse as JSON, use the text as-is
          console.log("Failed to parse error response as JSON:", e);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData?.error || "fortnox_api_error", 
          error_description: errorData?.error_description || responseText || "Unknown error from Fortnox API",
          status: response.status,
          details: errorData || responseText
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Parse the successful response as JSON
    let responseData;
    try {
      // Check if the response looks like JSON
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
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
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
    
    console.log("Token migration successful, returning response");
    
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
        error: "Server error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
