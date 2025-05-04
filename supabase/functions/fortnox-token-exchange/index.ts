
// Import required modules
import { corsHeaders } from "../_shared/cors.ts";
import { generateUUID } from "../_shared/utils.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Simple delay function for async operations
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main handler function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  // Use the polyfill to generate a session ID for logging
  const sessionId = generateUUID().substring(0, 8);
  console.log(`[${sessionId}] Token exchange request received`);
  
  try {
    // Parse request body
    let body;
    try {
      const textBody = await req.text();
      console.log(`[${sessionId}] Request body (raw):`, textBody);
      
      try {
        body = JSON.parse(textBody);
      } catch (parseError) {
        console.error(`[${sessionId}] JSON parse error:`, parseError);
        return new Response(
          JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (bodyError) {
      console.error(`[${sessionId}] Error reading request body:`, bodyError);
      return new Response(
        JSON.stringify({ error: 'Could not read request body', details: bodyError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { code, client_id, client_secret, redirect_uri } = body;

    console.log(`[${sessionId}] Request body validation:`, {
      hasCode: !!code,
      hasClientId: !!client_id,
      hasClientSecret: !!client_secret,
      hasRedirectUri: !!redirect_uri,
      codeLength: code?.length,
      redirectUri: redirect_uri
    });

    if (!code || !client_id || !client_secret || !redirect_uri) {
      console.error(`[${sessionId}] Missing required parameters`);
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the token exchange request
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri
    });

    const authString = `${client_id}:${client_secret}`;
    const base64Auth = btoa(authString);

    console.log(`[${sessionId}] Making token exchange request to Fortnox:`, {
      tokenUrl: FORTNOX_TOKEN_URL,
      redirectUri: redirect_uri,
      authStringLength: authString.length,
      grantType: 'authorization_code'
    });
    
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json'
      },
      body: params
    });

    const responseText = await response.text();
    console.log(`[${sessionId}] Fortnox response status:`, response.status);
    console.log(`[${sessionId}] Response headers:`, Object.fromEntries(response.headers));

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[${sessionId}] Response parsed successfully:`, {
        hasAccessToken: !!data.access_token,
        hasRefreshToken: !!data.refresh_token,
        hasExpiresIn: !!data.expires_in,
        error: data.error,
        errorDescription: data.error_description
      });
    } catch (e) {
      console.error(`[${sessionId}] Failed to parse response:`, e);
      console.log(`[${sessionId}] Raw response:`, responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Fortnox',
          details: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API error:`, data);
      return new Response(
        JSON.stringify({
          error: 'Fortnox API error',
          status: response.status,
          details: data
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data.access_token || !data.refresh_token) {
      console.error(`[${sessionId}] Invalid token data received:`, data);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token data received from Fortnox',
          details: 'Missing access_token or refresh_token'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[${sessionId}] Token exchange successful`);
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${sessionId}] Server error:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'server_error', 
        message: error.message || 'Unknown error',
        stack: error.stack || 'No stack trace'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
