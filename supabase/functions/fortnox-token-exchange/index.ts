
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
      console.log("Parsed request data:", {
        grantType: requestData.grant_type,
        hasCode: Boolean(requestData.code),
        codeLength: requestData.code?.length || 0,
        hasClientId: Boolean(requestData.client_id),
        hasClientSecret: Boolean(requestData.client_secret),
        hasRedirectUri: Boolean(requestData.redirect_uri)
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
    
    // Validate required fields for authorization_code grant type
    if (requestData.grant_type === 'authorization_code') {
      if (!requestData.code || !requestData.client_id || !requestData.client_secret || !requestData.redirect_uri) {
        const missingFields = [];
        if (!requestData.code) missingFields.push('code');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.redirect_uri) missingFields.push('redirect_uri');
        
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
    } else if (requestData.grant_type === 'refresh_token') {
      // Validate refresh token grant type
      if (!requestData.refresh_token || !requestData.client_id || !requestData.client_secret) {
        const missingFields = [];
        if (!requestData.refresh_token) missingFields.push('refresh_token');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        
        console.error(`Missing required parameters for refresh token: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "invalid_request", 
            error_description: "Missing required parameters for refresh token", 
            missing_fields: missingFields
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
          error_description: `Unsupported grant type: ${requestData.grant_type || "not provided"}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Create form data for the Fortnox API request
    const formData = new URLSearchParams();
    
    // Add all fields from the request to the form data
    for (const [key, value] of Object.entries(requestData)) {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    }
    
    console.log("Making request to Fortnox with grant_type:", requestData.grant_type);
    console.log("Form data keys:", Array.from(formData.keys()));
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    // Read the response as text
    const responseText = await response.text();
    
    console.log("Fortnox response status:", response.status);
    
    // Try to parse the response as JSON
    let responseData;
    
    try {
      // Only attempt to parse as JSON if the content appears to be JSON
      if (responseText && (
          response.headers.get('content-type')?.includes('application/json') ||
          (responseText.trim().startsWith('{') && responseText.trim().endsWith('}'))
      )) {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed token response as JSON");
      } else {
        console.error("Fortnox response is not JSON:", responseText);
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
      console.error("Failed to parse Fortnox response:", e);
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
      
      console.error("Fortnox API error:", {
        status: errorStatus,
        error: responseData.error || "unknown_error",
        description: responseData.error_description || "Unknown error"
      });
      
      // Handle common Fortnox errors
      if (responseData.error === 'invalid_grant') {
        return new Response(
          JSON.stringify({ 
            error: "invalid_grant", 
            error_description: responseData.error_description || "Authorization code has expired or is invalid",
            fortnox_error: responseData 
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
    if (!responseData.access_token) {
      console.error("Fortnox response missing access_token:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "invalid_response", 
          error_description: "Fortnox response missing access_token" 
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Fortnox token exchange successful");
    
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
