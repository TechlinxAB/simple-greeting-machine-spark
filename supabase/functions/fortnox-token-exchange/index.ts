
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
    console.log("Received token exchange request");
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed request data successfully", {
        hasCode: !!requestData.code,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasRedirectUri: !!requestData.redirect_uri
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
    if (!requestData.code || !requestData.client_id || !requestData.client_secret || !requestData.redirect_uri) {
      const missingFields = [];
      if (!requestData.code) missingFields.push('code');
      if (!requestData.client_id) missingFields.push('client_id');
      if (!requestData.client_secret) missingFields.push('client_secret');
      if (!requestData.redirect_uri) missingFields.push('redirect_uri');
      
      console.error(`Missing required parameters: ${missingFields.join(', ')}`, {
        hasCode: !!requestData.code,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasRedirectUri: !!requestData.redirect_uri
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters",
          details: {
            missing: missingFields,
            code: requestData.code ? "present" : "missing",
            client_id: requestData.client_id ? "present" : "missing",
            client_secret: requestData.client_secret ? "present" : "missing",
            redirect_uri: requestData.redirect_uri ? "present" : "missing"
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
          error: "Invalid client_id",
          details: "Client ID appears to be too short or invalid"
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
          error: "Invalid client_secret",
          details: "Client secret appears to be too short or invalid"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (requestData.code.length < 5) {
      console.error("Authorization code appears to be too short", { length: requestData.code.length });
      return new Response(
        JSON.stringify({ 
          error: "Invalid authorization code",
          details: "Authorization code appears to be too short or invalid"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Log received data (except sensitive data)
    console.log("Token exchange data received:", {
      code: requestData.code ? `${requestData.code.substring(0, 4)}...` : null,
      clientIdLength: requestData.client_id ? requestData.client_id.length : 0,
      clientSecretLength: requestData.client_secret ? requestData.client_secret.length : 0,
      redirectUri: requestData.redirect_uri
    });
    
    // Prepare the form data
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: requestData.code,
      client_id: requestData.client_id,
      client_secret: requestData.client_secret,
      redirect_uri: requestData.redirect_uri,
    });
    
    console.log("Making token exchange request to Fortnox with params", {
      grantType: 'authorization_code',
      redirectUri: requestData.redirect_uri,
      clientIdPrefix: requestData.client_id ? requestData.client_id.substring(0, 3) + "..." : "missing",
      codePrefix: requestData.code ? requestData.code.substring(0, 4) + "..." : "missing"
    });
    
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
      console.log("Successfully parsed Fortnox response as JSON", responseData);
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
    
    // If the response is not OK, return the error but make sure to return valid JSON with CORS headers
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
    
    console.log("Token exchange successful, returning response");
    
    // Return the token data with proper CORS headers
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-exchange:", error);
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
