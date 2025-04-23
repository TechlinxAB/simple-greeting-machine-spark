
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
      status: 204,
      headers: corsHeaders
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

  // Log all headers for debugging
  console.log(`[${sessionId}] Request Headers:`);
  for (const [key, value] of req.headers.entries()) {
    console.log(`[${sessionId}] ${key}: ${value}`);
  }

  // Get and log content length
  const contentLength = req.headers.get('content-length');
  console.log(`[${sessionId}] Content-Length: ${contentLength || 'not provided'}`);
  
  // Clone the request for backup in case we need to retry
  const clonedRequest = req.clone();
  
  // First attempt: try to read as text and parse
  let rawText;
  try {
    rawText = await req.text();
    console.log(`[${sessionId}] Raw request body length: ${rawText.length}`);
    
    if (rawText.length > 0) {
      console.log(`[${sessionId}] Raw request body sample: ${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}`);
    } else {
      console.error(`[${sessionId}] Empty request body detected`);
    }
  } catch (textError) {
    console.error(`[${sessionId}] Error reading request body as text:`, textError);
    
    // If text() fails, try arrayBuffer() as fallback
    try {
      const buffer = await clonedRequest.arrayBuffer();
      rawText = new TextDecoder().decode(buffer);
      console.log(`[${sessionId}] Fallback: Read body as arrayBuffer, length: ${rawText.length}`);
      
      if (rawText.length > 0) {
        console.log(`[${sessionId}] Fallback body sample: ${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}`);
      } else {
        console.error(`[${sessionId}] Fallback: Empty request body`);
      }
    } catch (bufferError) {
      console.error(`[${sessionId}] Fallback failed too:`, bufferError);
      
      return new Response(
        JSON.stringify({ 
          error: 'invalid_request', 
          message: 'Could not read request body (both text and arrayBuffer failed)',
          textError: textError.message,
          bufferError: bufferError.message,
          sessionId
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Validate the raw body content
  if (!rawText || rawText.length < 5) {
    console.error(`[${sessionId}] Empty or extremely short request body: "${rawText}"`);
    return new Response(
      JSON.stringify({ 
        error: 'empty_body', 
        message: 'Request body is empty or too short',
        sessionId,
        bodyLength: rawText?.length || 0
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse the body based on content type
  let body;
  const contentType = req.headers.get('content-type') || '';
  
  try {
    // Try multiple parsing approaches
    if (contentType.includes('application/json')) {
      // JSON parsing
      body = JSON.parse(rawText);
      console.log(`[${sessionId}] Parsed as JSON successfully`);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Form data parsing
      body = Object.fromEntries(new URLSearchParams(rawText));
      console.log(`[${sessionId}] Parsed as form-urlencoded successfully`);
    } else {
      // Auto-detect format: try JSON first, then form data
      try {
        body = JSON.parse(rawText);
        console.log(`[${sessionId}] Auto-detected and parsed as JSON`);
      } catch (jsonError) {
        try {
          body = Object.fromEntries(new URLSearchParams(rawText));
          console.log(`[${sessionId}] Auto-detected and parsed as form-urlencoded`);
        } catch (formError) {
          // Try to extract key=value pairs by string matching
          console.log(`[${sessionId}] Attempting manual key-value extraction`);
          const manualObj: Record<string, string> = {};
          const pairs = rawText.split('&');
          for (const pair of pairs) {
            const [key, value] = pair.split('=').map(decodeURIComponent);
            if (key && value) manualObj[key] = value;
          }
          
          if (Object.keys(manualObj).length > 0) {
            body = manualObj;
            console.log(`[${sessionId}] Manual key-value extraction succeeded`);
          } else {
            throw new Error("Could not parse as JSON, form data, or manual key-value pairs");
          }
        }
      }
    }
    
    console.log(`[${sessionId}] Parsed request body fields:`, Object.keys(body));
  } catch (parseError) {
    console.error(`[${sessionId}] Error parsing request body:`, parseError);
    console.error(`[${sessionId}] Raw body content: ${rawText.length > 250 ? rawText.substring(0, 250) + '...' : rawText}`);
    
    return new Response(
      JSON.stringify({ 
        error: 'invalid_request', 
        message: 'Could not parse request in any format',
        details: parseError.message,
        contentType,
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
    console.error(`[${sessionId}] Missing required parameters:`, missingParams);
    console.log(`[${sessionId}] Received parameters:`, Object.keys(body));
    
    return new Response(
      JSON.stringify({ 
        error: 'invalid_request', 
        message: `Missing required parameters: ${missingParams.join(', ')}`,
        receivedParams: Object.keys(body),
        sessionId
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log parameter details (sanitized)
  console.log(`[${sessionId}] 🔄 Preparing token exchange request:`);
  console.log(`[${sessionId}] Code length: ${body.code.length}`);
  console.log(`[${sessionId}] Code sample: ${body.code.substring(0, 10)}...${body.code.substring(body.code.length - 5)}`);
  console.log(`[${sessionId}] Client ID (first 4 chars): ${body.client_id.substring(0, 4)}...`);
  console.log(`[${sessionId}] Redirect URI: ${body.redirect_uri}`);

  // Prepare request to Fortnox API
  const formData = new URLSearchParams();
  formData.append('grant_type', 'authorization_code');
  formData.append('code', body.code);
  formData.append('redirect_uri', body.redirect_uri);

  const authString = `${body.client_id}:${body.client_secret}`;
  const base64Auth = btoa(authString);

  console.log(`[${sessionId}] Making request to Fortnox with authorization code grant`);
  
  // Set up timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  // Call Fortnox API
  let response;
  try {
    response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${base64Auth}`
      },
      body: formData.toString(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`[${sessionId}] Fortnox API response status: ${response.status}`);
    console.log(`[${sessionId}] Fortnox API response headers:`, 
      [...response.headers.entries()].reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, string>)
    );
  } catch (fetchError) {
    clearTimeout(timeoutId);
    
    const isTimeoutError = fetchError.name === 'AbortError';
    console.error(`[${sessionId}] ${isTimeoutError ? 'Timeout' : 'Network'} error during token fetch:`, fetchError);
    
    return new Response(
      JSON.stringify({ 
        error: isTimeoutError ? 'timeout_error' : 'network_error', 
        message: isTimeoutError ? 
          'Request to Fortnox API timed out after 30 seconds' : 
          'Failed to connect to Fortnox API',
        details: fetchError.message,
        sessionId
      }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Process Fortnox response
  const responseText = await response.text();
  console.log(`[${sessionId}] Fortnox response body length: ${responseText.length}`);
  
  if (responseText.length < 10) {
    console.error(`[${sessionId}] Unusually short response from Fortnox: "${responseText}"`);
  }

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
    console.error(`[${sessionId}] Error parsing Fortnox response:`, parseError);
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
    console.error(`[${sessionId}] Fortnox API error response:`, responseData);
    
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

  // Validate response data
  if (!responseData.access_token) {
    console.error(`[${sessionId}] Missing access_token in successful Fortnox response:`, responseData);
    
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

  // Log token details (sanitized)
  console.log(`[${sessionId}] 🔑 Token exchange successful:`, {
    accessTokenLength: responseData.access_token.length,
    refreshTokenLength: responseData.refresh_token?.length || 0,
    tokenType: responseData.token_type,
    expiresIn: responseData.expires_in
  });

  // Return successful response
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
