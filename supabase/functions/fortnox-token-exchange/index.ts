
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
      console.log("Received token exchange data", {
        hasCode: !!requestData.code,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasRedirectUri: !!requestData.redirect_uri,
        grantType: requestData.grant_type || "not provided"
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
    
    // Validate required fields for authorization code flow
    if (requestData.grant_type === 'authorization_code') {
      if (!requestData.code || !requestData.client_id || !requestData.client_secret || !requestData.redirect_uri) {
        const missingFields = [];
        if (!requestData.code) missingFields.push('code');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.redirect_uri) missingFields.push('redirect_uri');
        
        console.error(`Missing required parameters for auth code exchange: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "invalid_request", 
            error_description: "Missing required parameters", 
            details: { missing: missingFields } 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } else if (requestData.grant_type === 'refresh_token') {
      // Validate required fields for refresh token flow
      if (!requestData.refresh_token || !requestData.client_id || !requestData.client_secret) {
        const missingFields = [];
        if (!requestData.refresh_token) missingFields.push('refresh_token');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        
        console.error(`Missing required parameters for token refresh: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "invalid_request", 
            error_description: "Missing required parameters", 
            details: { missing: missingFields } 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } else {
      console.error(`Unsupported grant type: ${requestData.grant_type}`);
      
      return new Response(
        JSON.stringify({ 
          error: "unsupported_grant_type", 
          error_description: "Unsupported grant type"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Prepare form data from the request
    const formData = new URLSearchParams();
    
    for (const [key, value] of Object.entries(requestData)) {
      if (value) {
        formData.append(key, value.toString());
      }
    }
    
    console.log("Making token request to Fortnox with grant_type:", requestData.grant_type);
    
    // Make the token request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    // Get the response text
    const responseText = await response.text();
    console.log("Fortnox token response status:", response.status);
    
    let responseData;
    
    try {
      // Check if the response has a JSON content type or try to parse as JSON
      if (responseText && (
          response.headers.get('content-type')?.includes('application/json') ||
          (responseText.trim().startsWith('{') && responseText.trim().endsWith('}'))
      )) {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed token response as JSON");
      } else {
        console.error("Token response is not JSON:", responseText);
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
      console.error("Failed to parse token response as JSON:", e, "Raw response:", responseText);
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
    
    // If the response is not OK or contains an error field
    if (!response.ok || responseData.error) {
      const errorStatus = response.status || 400;
      
      console.error("Fortnox token API error:", {
        status: errorStatus,
        error: responseData.error || "unknown_error",
        error_description: responseData.error_description || "Unknown error"
      });
      
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
    
    // Verify required tokens are present
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
    
    console.log("Token exchange/refresh successful");
    
    // Return the successful token response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in token-exchange:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        error_description: error.message || "Unknown server error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
