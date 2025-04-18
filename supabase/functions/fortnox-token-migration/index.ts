
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
          error: "Invalid parameters",
          details: "One or more parameters appear to be too short or invalid"
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
    const formData = new URLSearchParams({
      access_token: requestData.access_token
    });
    
    console.log("Making token migration request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_MIGRATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: formData.toString(), // Ensure formData is correctly converted to string
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox migration response status:", response.status);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
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
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox API error during migration:", response.status, responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData?.error || "fortnox_api_error", 
          error_description: responseData?.error_description || "Unknown error from Fortnox API",
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
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
