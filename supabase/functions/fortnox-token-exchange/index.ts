
// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Main handler function
Deno.serve(async (req) => {
  // Generate a unique session ID for tracing this exchange session
  const sessionId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[${sessionId}] ===== TOKEN EXCHANGE FUNCTION CALLED =====`);
  console.log(`[${sessionId}] Request method: ${req.method}`);
  console.log(`[${sessionId}] Request URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${sessionId}] Handling CORS preflight request`);
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error(`[${sessionId}] Invalid request method: ${req.method}`);
    return new Response(
      JSON.stringify({ 
        error: 'method_not_allowed', 
        message: 'Only POST requests are allowed',
        sessionId
      }),
      { 
        status: 405, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Allow': 'POST, OPTIONS'
        } 
      }
    );
  }
  
  // Log request headers for debugging
  console.log(`[${sessionId}] Request headers:`);
  for (const [key, value] of req.headers.entries()) {
    console.log(`[${sessionId}] ${key}: ${value}`);
  }
  
  try {
    // Clone request for body reading
    const clonedReq = req.clone();
    let rawText = '';
    
    try {
      rawText = await clonedReq.text();
      console.log(`[${sessionId}] Raw request body length: ${rawText.length}`);
    } catch (textError) {
      console.error(`[${sessionId}] Error reading request body as text: ${textError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Could not read request body',
          details: textError.message,
          sessionId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!rawText || rawText.trim() === '') {
      console.error(`[${sessionId}] Empty request body received`);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Empty request body',
          details: 'The request body is empty',
          sessionId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try to parse the body as JSON
    let body;
    try {
      body = JSON.parse(rawText);
      console.log(`[${sessionId}] Parsed request body fields:`, Object.keys(body));
    } catch (parseError) {
      console.error(`[${sessionId}] Error parsing JSON: ${parseError.message}`);
      console.error(`[${sessionId}] Raw body content: ${rawText.substring(0, 500)}`);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Invalid JSON format',
          details: parseError.message,
          rawContent: rawText.length > 100 ? rawText.substring(0, 100) + '...' : rawText,
          sessionId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[${sessionId}] Required parameters check:`, {
      hasCode: !!body.code,
      hasClientId: !!body.client_id,
      hasClientSecret: !!body.client_secret,
      hasRedirectUri: !!body.redirect_uri
    });
    
    // Validate required parameters
    const missingParams = [];
    if (!body.code) missingParams.push('code');
    if (!body.client_id) missingParams.push('client_id');
    if (!body.client_secret) missingParams.push('client_secret');
    if (!body.redirect_uri) missingParams.push('redirect_uri');
    
    if (missingParams.length > 0) {
      console.error(`[${sessionId}] Missing required parameters: ${missingParams.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: `Missing required parameters: ${missingParams.join(', ')}`,
          details: `All of these parameters are required: code, client_id, client_secret, and redirect_uri`,
          received: Object.keys(body),
          sessionId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log key info for debugging (sanitized)
    console.log(`[${sessionId}] 🔄 Preparing token exchange request:`);
    console.log(`[${sessionId}] Code length: ${body.code.length}`);
    console.log(`[${sessionId}] Client ID: ${body.client_id.substring(0, 5)}...`);
    console.log(`[${sessionId}] Redirect URI: ${body.redirect_uri}`);
    
    // Prepare request to Fortnox API
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      redirect_uri: body.redirect_uri
    });
    
    // Create the Authorization header with Basic auth
    const authString = `${body.client_id}:${body.client_secret}`;
    const base64Auth = btoa(authString);
    
    console.log(`[${sessionId}] Making request to Fortnox with authorization code grant`);
    
    // Make request to Fortnox with proper error handling
    let response;
    try {
      response = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${base64Auth}`
        },
        body: formData.toString()
      });
    } catch (fetchError) {
      console.error(`[${sessionId}] Network error during token fetch: ${fetchError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'network_error', 
          message: 'Failed to connect to Fortnox API',
          details: fetchError.message,
          sessionId
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[${sessionId}] 📬 Fortnox responded with status: ${response.status}`);
    
    // Get response body as text
    let responseText;
    try {
      responseText = await response.text();
      console.log(`[${sessionId}] Response body length: ${responseText.length}`);
    } catch (textError) {
      console.error(`[${sessionId}] Error reading response body: ${textError.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_response', 
          message: 'Could not read response from Fortnox',
          details: textError.message,
          status: response.status,
          sessionId
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try to parse the response as JSON
    let responseData;
    try {
      if (responseText && responseText.trim()) {
        responseData = JSON.parse(responseText);
        console.log(`[${sessionId}] Parsed response fields:`, Object.keys(responseData));
      } else {
        console.error(`[${sessionId}] Empty response from Fortnox`);
        return new Response(
          JSON.stringify({ 
            error: 'empty_response', 
            message: 'Empty response from Fortnox API',
            status: response.status,
            sessionId
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (parseError) {
      console.error(`[${sessionId}] Error parsing Fortnox response: ${parseError.message}`);
      console.error(`[${sessionId}] Raw response: ${responseText.substring(0, 500)}`);
      return new Response(
        JSON.stringify({ 
          error: 'invalid_response', 
          message: 'Invalid response format from Fortnox',
          details: parseError.message,
          rawResponse: responseText.substring(0, 300) + (responseText.length > 300 ? '...' : ''),
          status: response.status,
          sessionId
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
          details: responseData,
          status: response.status,
          sessionId
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
          message: 'Missing access token in response',
          details: responseData,
          sessionId
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log token details for debugging (sanitized)
    console.log(`[${sessionId}] 🔑 Received tokens:`, {
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token?.length || 0,
      tokenType: responseData.token_type,
      expiresIn: responseData.expires_in
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
    // Handle any unexpected errors
    console.error(`[${sessionId}] Unexpected error: ${error.message}`);
    console.error(`[${sessionId}] Stack trace: ${error.stack || 'No stack trace available'}`);
    return new Response(
      JSON.stringify({ 
        error: 'server_error', 
        message: error.message || 'An unexpected error occurred',
        stack: error.stack || 'No stack trace available',
        sessionId
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
