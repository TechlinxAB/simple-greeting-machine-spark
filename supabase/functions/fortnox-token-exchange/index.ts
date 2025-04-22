
// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Function to check if a value is a valid JWT
function isValidJwtFormat(token: string): boolean {
  if (typeof token !== 'string') return false;
  if (token.length < 20) return false; // Arbitrary minimum length
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

// Function to validate refresh token
function isValidRefreshToken(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

// Simple delay function for async operations
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to compute SHA-256 hash for token validation
async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
  console.log(`[${sessionId}] Request headers:`, req.headers);
  console.log(`[${sessionId}] Content-Type:`, req.headers.get("Content-Type"));
  
  try {
    // Parse the request body
    let body;
    try {
      const rawText = await req.text();
      console.log(`[${sessionId}] Raw JSON body:`, rawText);
      body = JSON.parse(rawText);
      console.log(`[${sessionId}] 📦 Parsed JSON body:`, {
        client_id: body.client_id ? `${body.client_id.substring(0, 10)}...` : undefined,
        client_secret: body.client_secret ? '•••' : undefined,
        code: body.code ? `${body.code.substring(0, 10)}...` : undefined,
        redirect_uri: body.redirect_uri
      });
    } catch (e) {
      console.error(`[${sessionId}] Error parsing request body:`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_request', message: 'Invalid request body' }),
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
        JSON.stringify({ error: 'invalid_request', message: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log key info for debugging
    console.log(`[${sessionId}] 🔄 Sending request to Fortnox:`);
    console.log(`[${sessionId}] URL:`, FORTNOX_TOKEN_URL);
    console.log(`[${sessionId}] Method: POST`);
    console.log(`[${sessionId}] Headers:`, {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: "Basic •••"
    });
    console.log(`[${sessionId}] Body (form data):`, `grant_type=authorization_code&code=${body.code}&redirect_uri=${encodeURIComponent(body.redirect_uri)}`);
    
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
    console.log(`[${sessionId}] 🧾 Fortnox response body:`, responseText);
    
    // Parse response JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[${sessionId}] Error parsing Fortnox response:`, e);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Invalid response from Fortnox' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API returned error status ${response.status}:`, responseData);
      return new Response(
        JSON.stringify(responseData),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate the tokens received from Fortnox
    if (!responseData.access_token) {
      console.error(`[${sessionId}] Missing access_token in Fortnox response:`, responseData);
      return new Response(
        JSON.stringify({ error: 'invalid_response', message: 'Missing access token in response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate token formats
    const accessTokenValid = isValidJwtFormat(responseData.access_token);
    const refreshTokenValid = isValidRefreshToken(responseData.refresh_token);
    
    console.log(`[${sessionId}] Token validation:`, {
      accessTokenValid,
      refreshTokenValid,
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token ? responseData.refresh_token.length : 0
    });
    
    if (!accessTokenValid) {
      console.error(`[${sessionId}] Invalid access token format received from Fortnox`);
      return new Response(
        JSON.stringify({ error: 'invalid_token', message: 'Invalid access token format' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!refreshTokenValid) {
      console.warn(`[${sessionId}] Invalid or missing refresh token format from Fortnox`);
      // We continue anyway since the access token is valid
    }
    
    // Log token details for debugging
    console.log(`[${sessionId}] 🔑 Received tokens:`, {
      accessTokenLength: responseData.access_token.length,
      refreshTokenLength: responseData.refresh_token?.length || 0,
      accessTokenPreview: `${responseData.access_token.substring(0, 20)}...${responseData.access_token.substring(responseData.access_token.length - 20)}`,
      refreshTokenPreview: responseData.refresh_token ? 
        `${responseData.refresh_token.substring(0, 10)}...${responseData.refresh_token.substring(responseData.refresh_token.length - 5)}` : 
        'none'
    });
    
    // Compute hashes for verification
    const accessTokenHash = await computeHash(responseData.access_token);
    const refreshTokenHash = responseData.refresh_token ? await computeHash(responseData.refresh_token) : 'no-refresh-token';
    
    console.log(`[${sessionId}] 🔐 Token hashes for verification:`, {
      accessTokenHash: `${accessTokenHash.substring(0, 10)}...`,
      refreshTokenHash: `${refreshTokenHash.substring(0, 10)}...`,
    });
    
    // Return successful response with tokens and hashes for verification
    return new Response(
      JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        token_type: responseData.token_type,
        expires_in: responseData.expires_in,
        _debug: {
          session_id: sessionId,
          access_token_length: responseData.access_token.length,
          refresh_token_length: responseData.refresh_token?.length || 0,
          access_token_hash: accessTokenHash,
          refresh_token_hash: refreshTokenHash
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[${sessionId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: 'server_error', message: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
