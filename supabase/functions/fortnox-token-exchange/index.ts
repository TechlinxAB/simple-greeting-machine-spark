// Import required modules
import { corsHeaders } from "../_shared/cors.ts";

// Configure Fortnox OAuth token endpoint
const FORTNOX_TOKEN_URL = 'https://api.fortnox.se/oauth-v2/token';

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

  const sessionId = crypto.randomUUID().substring(0, 8);
  console.log(`[${sessionId}] Token exchange request received`);

  try {
    const body = await req.json();
    const { code, client_id, client_secret, redirect_uri } = body;

    if (!code || !client_id || !client_secret || !redirect_uri) {
      console.error(`[${sessionId}] Missing required parameters`);
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders } }
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

    console.log(`[${sessionId}] Making token exchange request to Fortnox`);
    
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json'
      },
      body: params
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API error:`, data);
      return new Response(
        JSON.stringify(data),
        { status: response.status, headers: { ...corsHeaders } }
      );
    }

    console.log(`[${sessionId}] Token exchange successful`);
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders } }
    );

  } catch (error) {
    console.error(`[${sessionId}] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders } }
    );
  }
});
