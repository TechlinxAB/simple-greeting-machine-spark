
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
      console.log("Request payload received:", {
        hasCode: !!requestData.code,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasRedirectUri: !!requestData.redirect_uri,
        hasRefreshToken: !!requestData.refresh_token,
        grantType: requestData.grant_type || 'authorization_code' // Default to authorization_code
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
    
    // Set default grant_type if not provided
    const grantType = requestData.grant_type || 'authorization_code';
    
    // Validate required fields based on grant type
    if (grantType === 'authorization_code') {
      if (!requestData.code || !requestData.client_id || !requestData.client_secret || !requestData.redirect_uri) {
        const missingFields = [];
        if (!requestData.code) missingFields.push('code');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.redirect_uri) missingFields.push('redirect_uri');
        
        console.error(`Missing required parameters for authorization_code flow: ${missingFields.join(', ')}`, {
          code: requestData.code || null,
          clientId: requestData.client_id || null,
          clientSecretProvided: !!requestData.client_secret,
          redirectUri: requestData.redirect_uri || null
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
    } else if (grantType === 'refresh_token') {
      if (!requestData.refresh_token || !requestData.client_id || !requestData.client_secret) {
        const missingFields = [];
        if (!requestData.refresh_token) missingFields.push('refresh_token');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        
        console.error(`Missing required parameters for refresh_token flow: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "Missing required parameters for token refresh",
            details: {
              missing: missingFields
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }
    
    // Additional validation for parameter lengths
    if (requestData.client_id && requestData.client_id.length < 5) {
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
    
    if (requestData.client_secret && requestData.client_secret.length < 5) {
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
    
    if (grantType === 'authorization_code' && requestData.code && requestData.code.length < 5) {
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
    console.log("Token exchange request data:", {
      grantType,
      hasCode: grantType === 'authorization_code' && !!requestData.code,
      hasRefreshToken: grantType === 'refresh_token' && !!requestData.refresh_token,
      clientIdLength: requestData.client_id ? requestData.client_id.length : 0,
      clientSecretLength: requestData.client_secret ? requestData.client_secret.length : 0,
      redirectUri: requestData.redirect_uri
    });
    
    // Prepare the form data
    const formData = new URLSearchParams();
    formData.append('grant_type', grantType);
    formData.append('client_id', requestData.client_id);
    formData.append('client_secret', requestData.client_secret);
    
    // Add parameters specific to grant type
    if (grantType === 'authorization_code') {
      formData.append('code', requestData.code);
      formData.append('redirect_uri', requestData.redirect_uri);
    } else if (grantType === 'refresh_token') {
      formData.append('refresh_token', requestData.refresh_token);
    }
    
    console.log(`Making ${grantType} request to Fortnox`);
    
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
    console.log("Fortnox raw response:", responseText);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON", {
        hasAccessToken: !!responseData.access_token,
        hasRefreshToken: !!responseData.refresh_token,
        hasError: !!responseData.error,
        error: responseData.error,
        errorDescription: responseData.error_description
      });
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
    
    // Return the response, including errors from Fortnox if any
    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
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
