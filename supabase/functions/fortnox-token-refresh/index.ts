
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Fortnox Token Refresh API endpoint
const FORTNOX_TOKEN_URL = 'https://api.fortnox.se/3/oauth-v2/token';

interface TokenRefreshRequest {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  force?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique session ID for tracing
    const sessionId = crypto.randomUUID().substring(0, 8);
    console.log(`[${sessionId}] ===== TOKEN REFRESH FUNCTION CALLED =====`);

    // Parse request body
    let requestData: TokenRefreshRequest;
    try {
      const rawText = await req.text();
      console.log(`[${sessionId}] Raw request body:`, rawText);
      requestData = JSON.parse(rawText);
      console.log(`[${sessionId}] 📦 Parsed refresh request:`, {
        hasRefreshToken: !!requestData.refresh_token,
        hasClientId: !!requestData.client_id,
        hasClientSecret: !!requestData.client_secret,
        hasRedirectUri: !!requestData.redirect_uri,
        force: !!requestData.force
      });
    } catch (e) {
      console.error(`[${sessionId}] Error parsing request body:`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required parameters
    if (!requestData.refresh_token || !requestData.client_id || !requestData.client_secret) {
      console.error(`[${sessionId}] Missing required parameters`);
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Missing required parameters for token refresh',
          requiresReconnect: false,
          error: 'Missing refresh_token, client_id, or client_secret' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare request to Fortnox API
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: requestData.refresh_token,
      redirect_uri: requestData.redirect_uri
    });
    
    // Create the Authorization header with Basic auth
    const authString = `${requestData.client_id}:${requestData.client_secret}`;
    const base64Auth = btoa(authString);
    const authHeader = `Basic ${base64Auth}`;
    
    // Log key info for debugging
    console.log(`[${sessionId}] 🔄 Sending token refresh request to Fortnox:`);
    console.log(`[${sessionId}] URL:`, FORTNOX_TOKEN_URL);
    console.log(`[${sessionId}] Method: POST`);
    console.log(`[${sessionId}] Authorization: Basic •••`);
    
    // Make request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: formData
    });
    
    console.log(`[${sessionId}] 📬 Fortnox responded with status:`, response.status);
    
    // Get response body as text
    const responseText = await response.text();
    console.log(`[${sessionId}] 🧾 Fortnox response body:`, responseText);
    
    // Parse response JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[${sessionId}] Error parsing Fortnox response:`, e);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Invalid response from Fortnox',
          requiresReconnect: false,
          error: 'Could not parse Fortnox API response' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API returned error status ${response.status}:`, responseData);
      
      // Check if the error is due to an invalid grant (e.g., refresh token expired or revoked)
      const errorText = responseText || '';
      const isInvalidGrant = errorText.includes('invalid_grant');
      
      return new Response(
        JSON.stringify({ 
          success: false,
          message: isInvalidGrant ? 'Refresh token is invalid or expired' : 'Failed to refresh token',
          requiresReconnect: isInvalidGrant,
          error: `Fortnox API error: ${response.status} ${response.statusText}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate the tokens received from Fortnox
    if (!responseData.access_token) {
      console.error(`[${sessionId}] Missing access_token in Fortnox response:`, responseData);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Missing access token in response',
          requiresReconnect: false,
          error: 'Incomplete token data received from Fortnox' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Return successful response with new tokens
    console.log(`[${sessionId}] 🔑 Token refresh successful`);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token,
        expiresIn: responseData.expires_in || 3600,
        requiresReconnect: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unexpected error in token refresh:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error during token refresh',
        requiresReconnect: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
