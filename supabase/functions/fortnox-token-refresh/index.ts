
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
        hasClientSecret: !!requestData.client_secret
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
    if (!requestData.client_id || !requestData.client_secret || !requestData.refresh_token) {
      const missingFields = [];
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      if (!requestData.refresh_token) missingFields.push('refresh_token');
      
      console.error(`Missing required parameters: ${missingFields.join(', ')}`, {
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasRefreshToken: !!requestData.refresh_token
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters",
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
    
    // Log received data (except sensitive data)
    console.log("Token refresh data received:", {
      refreshTokenLength: requestData.refresh_token ? requestData.refresh_token.length : 0,
      clientIdLength: requestData.client_id ? requestData.client_id.length : 0,
      clientSecretLength: requestData.client_secret ? requestData.client_secret.length : 0,
    });
    
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
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
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
      console.error("Fortnox API error:", response.status, responseData);
      return new Response(
        JSON.stringify({ 
          error: "Fortnox API error", 
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
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
