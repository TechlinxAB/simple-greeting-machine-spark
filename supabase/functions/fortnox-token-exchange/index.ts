
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
    console.log("===== TOKEN EXCHANGE FUNCTION CALLED =====");
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    
    // Log all request headers for debugging
    console.log("Request headers:");
    for (const [key, value] of req.headers.entries()) {
      console.log(`  ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    }
    
    // Parse the request body
    let requestData;
    let requestText;
    try {
      requestText = await req.text();
      console.log("Raw request body:", requestText);
      
      try {
        requestData = JSON.parse(requestText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        console.log("Attempting to parse as URL encoded form data");
        
        // Try to parse as form data
        const formData = new URLSearchParams(requestText);
        requestData = {};
        for (const [key, value] of formData.entries()) {
          requestData[key] = value;
        }
      }
      
      // Log request data with sensitive info partially masked
      console.log("Parsed request payload:", {
        grant_type: requestData.grant_type || 'authorization_code',
        code: requestData.code ? `${requestData.code.substring(0, 5)}...` : null,
        client_id: requestData.client_id ? `${requestData.client_id.substring(0, 5)}...` : null,
        client_secret: requestData.client_secret ? 'PROVIDED (masked)' : null,
        redirect_uri: requestData.redirect_uri,
        refresh_token: requestData.refresh_token ? 'PROVIDED (masked)' : null,
      });
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: e.message,
          raw_body: requestText?.substring(0, 200) || 'Empty body'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Set default grant_type if not provided
    const grantType = requestData.grant_type || 'authorization_code';
    console.log(`Using grant type: ${grantType}`);
    
    // Validate required fields based on grant type
    if (grantType === 'authorization_code') {
      if (!requestData.code || !requestData.client_id || !requestData.client_secret || !requestData.redirect_uri) {
        const missingFields = [];
        if (!requestData.code) missingFields.push('code');
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.redirect_uri) missingFields.push('redirect_uri');
        
        console.error(`Missing required parameters for authorization_code flow: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "Missing required parameters",
            details: {
              missing: missingFields,
              got: Object.keys(requestData)
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
              missing: missingFields,
              got: Object.keys(requestData)
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
          details: "Client ID appears to be too short or invalid",
          length: requestData.client_id.length,
          value: requestData.client_id
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
          details: "Client secret appears to be too short or invalid",
          length: requestData.client_secret.length
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
          details: "Authorization code appears to be too short or invalid",
          length: requestData.code.length,
          value: requestData.code
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
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
    
    console.log(`===== MAKING ${grantType.toUpperCase()} REQUEST TO FORTNOX =====`);
    console.log(`Fortnox Token URL: ${FORTNOX_TOKEN_URL}`);
    console.log("Form data parameters:", Array.from(formData.keys()));
    
    // Log the exact form-encoded body being sent (with sensitive data masked)
    const maskedFormData = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (key === 'client_secret' || key === 'refresh_token') {
        maskedFormData.append(key, '********');
      } else if (key === 'code') {
        maskedFormData.append(key, value.substring(0, 5) + '...');
      } else if (key === 'client_id') {
        maskedFormData.append(key, value.substring(0, 5) + '...');
      } else {
        maskedFormData.append(key, value);
      }
    }
    console.log("Encoded request body:", maskedFormData.toString());
    
    // Make the request to Fortnox
    console.log("Sending request to Fortnox API...");
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
    console.log("Fortnox response headers:", Object.fromEntries([...response.headers.entries()]));
    console.log("Fortnox raw response:", responseText);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON:", {
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
          rawResponse: responseText,
          status: response.status,
          headers: Object.fromEntries([...response.headers.entries()]),
          parseError: e.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If Fortnox returned a non-200 status, pass that through with the error details
    if (!response.ok) {
      console.error(`Fortnox API returned error status ${response.status}:`, responseData);
      return new Response(
        JSON.stringify({
          error: responseData.error || "Fortnox API error",
          error_description: responseData.error_description || "Unknown error from Fortnox API",
          http_status: response.status,
          fortnox_response: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("Token exchange/refresh successful");
    
    // Return the successful response
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
        stack: error.stack || "No stack trace",
        time: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
