
// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

Deno.serve(async (req) => {
  const sessionId = crypto.randomUUID().substring(0, 8);
  console.log(`[${sessionId}] ===== TOKEN EXCHANGE FUNCTION CALLED =====`);
  console.log(`[${sessionId}] Request method: ${req.method}`);
  console.log(`[${sessionId}] Request URL: ${req.url}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${sessionId}] Handling CORS preflight request`);
    return new Response(null, { 
      headers: {
        ...corsHeaders
      }
    });
  }

  // Enforce POST only
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

  // Log all headers
  console.log(`[${sessionId}] Headers:`);
  for (const [key, value] of req.headers.entries()) {
    console.log(`[${sessionId}] ${key}: ${value}`);
  }
  console.log(`[${sessionId}] Content-Length:`, req.headers.get('content-length') || 'null');

  // Strictly read and parse JSON body
  let rawText = '';
  try {
    rawText = await req.text();
    console.log(`[${sessionId}] Raw request body length: ${rawText.length}`);
    if (rawText.length < 5) {
      console.error(`[${sessionId}] Empty or very short request body.`);
      return new Response(
        JSON.stringify({ 
          error: 'empty_body', 
          message: 'Request body is empty or too short',
          sessionId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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

  let body;
  try {
    body = JSON.parse(rawText);
    console.log(`[${sessionId}] Parsed request body fields:`, Object.keys(body));
  } catch (parseError) {
    console.error(`[${sessionId}] Error parsing JSON: ${parseError.message}`);
    console.error(`[${sessionId}] Raw body content: ${rawText.length > 250 ? rawText.substring(0, 250) + '...' : rawText}`);
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
        sessionId
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log parameter lengths to avoid leaking secrets
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

  const authString = `${body.client_id}:${body.client_secret}`;
  const base64Auth = btoa(authString);

  console.log(`[${sessionId}] Making request to Fortnox with authorization code grant`);

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

  const responseText = await response.text();
  console.log(`[${sessionId}] Fortnox response status: ${response.status}`);
  console.log(`[${sessionId}] Response body length: ${responseText.length}`);

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
    console.error(`[${sessionId}] Raw response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`);
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

  // Log token details (sanitizing secret fields)
  console.log(`[${sessionId}] 🔑 Received tokens:`, {
    accessTokenLength: responseData.access_token.length,
    refreshTokenLength: responseData.refresh_token?.length || 0,
    tokenType: responseData.token_type,
    expiresIn: responseData.expires_in
  });

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
});
