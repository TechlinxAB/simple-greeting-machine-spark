
// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Main handler function
Deno.serve(async (req) => {
  // Generate a unique session ID for tracing this exchange session
  const sessionId = crypto.randomUUID().substring(0, 8);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${sessionId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log(`[${sessionId}] ===== TOKEN EXCHANGE FUNCTION CALLED =====`);
  console.log(`[${sessionId}] Request method:`, req.method);
  
  try {
    // Parse the request body with better error handling
    let body;
    try {
      // Check if request body is empty
      const clonedReq = req.clone();
      const rawText = await clonedReq.text();
      console.log(`[${sessionId}] Raw request body:`, rawText);
      
      if (!rawText || rawText.trim() === '') {
        console.error(`[${sessionId}] Empty request body received`);
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request', 
            message: 'Empty request body',
            details: 'The request body is empty or not properly formatted JSON'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[${sessionId}] Raw request body length:`, rawText.length);
      
      try {
        body = JSON.parse(rawText);
      } catch (parseError) {
        console.error(`[${sessionId}] Error parsing JSON:`, parseError);
        return new Response(
          JSON.stringify({ 
            error: 'invalid_request', 
            message: 'Invalid JSON format',
            details: parseError.message 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`[${sessionId}] 📦 Parsed request body:`, {
        client_id: body.client_id ? `${body.client_id.substring(0, 5)}...` : undefined,
        client_secret: body.client_secret ? '•••' : undefined,
        code: body.code ? `${body.code.substring(0, 5)}...` : undefined,
        redirect_uri: body.redirect_uri
      });
    } catch (e) {
      console.error(`[${sessionId}] Error handling request body:`, e);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Invalid request body',
          details: e.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required parameters
    if (!body.code || !body.client_id || !body.client_secret || !body.redirect_uri) {
      console.error(`[${sessionId}] Missing required parameters:`, {
        hasCode: !!body.code,
        hasClientId: !!body.client_id,
        hasClientSecret: !!body.client_secret,
        hasRedirectUri: !!body.redirect_uri
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Missing required parameters',
          details: 'code, client_id, client_secret, and redirect_uri are all required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log key info for debugging
    console.log(`[${sessionId}] 🔄 Sending request to Fortnox:`);
    console.log(`[${sessionId}] URL:`, FORTNOX_TOKEN_URL);
    
    // Prepare request to Fortnox API
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirect_uri
    });
    
    // Create the Authorization header with Basic auth
    const authString = `${body.client_id}:${body.client_secret}`;
    const base64Auth = btoa(authString);
    const authHeader = `Basic ${base64Auth}`;
    
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
    console.log(`[${sessionId}] 🧾 Fortnox response body length:`, responseText.length);
    
    // Parse response JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[${sessionId}] Error parsing Fortnox response:`, e);
      console.error(`[${sessionId}] Raw response text:`, responseText);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_response', 
          message: 'Invalid response from Fortnox',
          details: e.message,
          rawResponse: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API returned error status ${response.status}:`, responseData);
      return new Response(
        JSON.stringify({
          error: responseData.error || 'api_error',
          message: responseData.error_description || 'Error from Fortnox API',
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate the tokens received from Fortnox
    if (!responseData.access_token) {
      console.error(`[${sessionId}] Missing access_token in Fortnox response:`, responseData);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_response', 
          message: 'Missing access token in response'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log token details for debugging
    console.log(`[${sessionId}] 🔑 Received tokens:`, {
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token?.length || 0,
      accessTokenPreview: `${responseData.access_token.substring(0, 10)}...`,
      refreshTokenPreview: responseData.refresh_token ? 
        `${responseData.refresh_token.substring(0, 5)}...` : 
        'none'
    });
    
    // Return successful response with tokens
    return new Response(
      JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        token_type: responseData.token_type,
        expires_in: responseData.expires_in,
        _debug: {
          session_id: sessionId,
          access_token_length: responseData.access_token.length,
          refresh_token_length: responseData.refresh_token?.length || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[${sessionId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'server_error', 
        message: error.message || 'An unexpected error occurred',
        stack: error.stack || ''
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
