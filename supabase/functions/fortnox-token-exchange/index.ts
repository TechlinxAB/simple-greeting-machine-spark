
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
  
  // Handle test requests with special path
  const url = new URL(req.url);
  if (url.pathname.endsWith('/test')) {
    console.log("Test endpoint called");
    return new Response(JSON.stringify({
      success: true,
      message: "Test endpoint is working",
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries([...req.headers.entries()]),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  try {
    console.log("===== TOKEN EXCHANGE FUNCTION CALLED =====");
    
    // Parse the request body
    let requestData;
    let requestText;
    try {
      requestText = await req.text();
      console.log("📦 Received request body:", requestText);
      
      try {
        requestData = JSON.parse(requestText);
        console.log("📦 Parsed request body:", {
          client_id: requestData.client_id ? `${requestData.client_id.substring(0, 5)}...` : null,
          client_secret: requestData.client_secret ? '•••' : null,
          code: requestData.code ? `${requestData.code.substring(0, 10)}...` : null,
          redirect_uri: requestData.redirect_uri
        });
      } catch (parseError) {
        console.error("JSON parse error:", parseError.message);
        
        // Try to parse as form data
        const formData = new URLSearchParams(requestText);
        requestData = {};
        for (const [key, value] of formData.entries()) {
          requestData[key] = value;
        }
      }
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description: "Invalid request body format",
          details: e.message
        }),
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
        
        console.error(`Missing required parameters for authorization_code flow: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "invalid_request",
            error_description: `Missing required parameters: ${missingFields.join(', ')}` 
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
            error: "invalid_request",
            error_description: `Missing required parameters for token refresh: ${missingFields.join(', ')}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
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
    
    // Log the request to Fortnox (with masked sensitive data)
    const maskedFormData = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (key === 'client_secret') {
        maskedFormData.append(key, '•••');
      } else if (key === 'code') {
        maskedFormData.append(key, value.substring(0, 10) + '...');
      } else if (key === 'client_id') {
        maskedFormData.append(key, value.substring(0, 5) + '...');
      } else {
        maskedFormData.append(key, value);
      }
    }
    console.log("🔁 Sending request to Fortnox:");
    console.log(maskedFormData.toString());
    
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
    console.log("📬 Fortnox responded with status:", response.status);
    console.log("🧾 Fortnox response body:");
    console.log(responseText);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "server_error", 
          error_description: "Failed to parse Fortnox response",
          details: {
            rawResponse: responseText,
            parseError: e.message
          }
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
      
      // Handle specific error cases
      let statusCode = response.status;
      
      // Provide more specific error information based on Fortnox errors
      if (responseData.error === 'invalid_grant' && responseData.error_description?.includes('expired')) {
        return new Response(
          JSON.stringify({
            error: responseData.error,
            error_description: responseData.error_description,
            error_hint: "Authorization code has expired. Please try connecting to Fortnox again.",
            http_status: response.status,
            request_needs_retry: true
          }),
          { 
            status: 401, // Using 401 for expired tokens/codes
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({
          error: responseData.error || "fortnox_api_error",
          error_description: responseData.error_description || "Unknown error from Fortnox API",
          http_status: response.status
        }),
        { 
          status: statusCode, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("✅ Token exchange/refresh successful");
    
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
        error: "server_error", 
        error_description: "Server error occurred during token exchange",
        details: error.message || "Unknown error"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
