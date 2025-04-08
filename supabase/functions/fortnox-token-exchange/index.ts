
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

serve(async (req) => {
  try {
    // Parse the request body
    const requestData = await req.json();
    
    // Validate required fields
    if (!requestData.code || !requestData.client_id || !requestData.client_secret || !requestData.redirect_uri) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Prepare the form data
    const formData = new URLSearchParams({
      grant_type: requestData.grant_type || 'authorization_code',
      code: requestData.code,
      client_id: requestData.client_id,
      client_secret: requestData.client_secret,
      redirect_uri: requestData.redirect_uri,
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
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // If the response is not OK, return the error
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: "Fortnox API error", 
          status: response.status,
          details: responseData
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
