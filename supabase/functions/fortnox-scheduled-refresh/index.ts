
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { jwtVerify, decodeJwt } from "https://deno.land/x/jose@v4.14.4/index.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const jwtSecret = Deno.env.get('JWT_SECRET');

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple delay function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility function to validate access token structure
function isValidJwtFormat(token: string): boolean {
  if (typeof token !== 'string') return false;
  if (token.length < 20) return false; // Arbitrary minimum length
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

// Utility function to validate refresh token
function isValidRefreshToken(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

// Helper to check JWT expiration time
function getTokenExpirationTime(token: string): number | null {
  try {
    const decoded = decodeJwt(token);
    return decoded.exp || null;
  } catch (err) {
    console.error("Error decoding JWT:", err);
    return null;
  }
}

// Check if token needs refresh (less than 30 minutes remaining)
function tokenNeedsRefresh(token: string): boolean {
  const expTime = getTokenExpirationTime(token);
  if (!expTime) return true; // If we can't determine expiration, refresh to be safe
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeRemaining = expTime - now;
  const thirtyMinutesInSeconds = 30 * 60;
  
  return timeRemaining < thirtyMinutesInSeconds;
}

// Helper to log refresh attempts to the database
async function logRefreshAttempt(
  supabase, 
  success: boolean, 
  message: string, 
  sessionId: string, 
  tokenLength?: number
) {
  try {
    const { error } = await supabase
      .from('token_refresh_logs')
      .insert({
        success,
        message,
        token_length: tokenLength,
        session_id: sessionId
      });
      
    if (error) {
      console.error(`[${sessionId}] Error logging refresh attempt:`, error);
    } else {
      console.log(`[${sessionId}] Successfully logged refresh attempt`);
    }
  } catch (err) {
    console.error(`[${sessionId}] Exception logging refresh attempt:`, err);
  }
}

// This function will be called by a scheduled cron job or manually
Deno.serve(async (req) => {
  // Generate a unique session ID for this refresh operation
  const sessionId = crypto.randomUUID().substring(0, 8);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log(`[${sessionId}] 🚀 Starting Fortnox token refresh process`);
    
    // Parse request body if it exists
    let force = false;
    try {
      const body = await req.json();
      force = !!body.force;
      console.log(`[${sessionId}] 📝 Request body:`, { force });
    } catch (e) {
      console.log(`[${sessionId}] ⚠️ No valid request body found`);
    }
    
    // Authentication check
    const apiKey = req.headers.get("x-api-key");
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");

    console.log(`[${sessionId}] 🔐 Authentication check:`, {
      authHeaderPresent: !!req.headers.get("Authorization"),
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      validKeyLength: validKey ? validKey.length : 0,
      jwtSecretPresent: !!jwtSecret
    });
    
    // Check for system-level authentication via API key
    const isSystemAuthenticated = validKey && apiKey === validKey;
    
    // Check for user authentication via JWT token
    let userAuthenticated = false;
    
    if (!isSystemAuthenticated && token && jwtSecret) {
      try {
        const encoder = new TextEncoder();
        const { payload } = await jwtVerify(token, encoder.encode(jwtSecret));
        console.log(`[${sessionId}] ✅ JWT manually validated via jose, user ID:`, payload.sub);
        userAuthenticated = true;
      } catch (err) {
        console.error(`[${sessionId}] ❌ JWT verification failed (via jose):`, err);
      }
    }
    
    const isAuthenticated = isSystemAuthenticated || userAuthenticated;
    
    if (!isAuthenticated) {
      console.error(`[${sessionId}] ❌ Unauthorized access to Fortnox token refresh`);
      
      // Log unauthorized attempt
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await logRefreshAttempt(supabase, false, "Unauthorized access attempt", sessionId);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "unauthorized", 
          message: "Missing or invalid API key or user token" 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log(`[${sessionId}] ✅ Authentication successful:`, {
      systemAuth: isSystemAuthenticated,
      userAuth: userAuthenticated
    });
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${sessionId}] ❌ Supabase configuration missing`);
      return new Response(
        JSON.stringify({ 
          error: "server_configuration_error", 
          message: "Server configuration incomplete" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox credentials from database
    console.log(`[${sessionId}] 📚 Retrieving Fortnox credentials from database`);
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error(`[${sessionId}] ❌ Error retrieving Fortnox credentials:`, settingsError);
      await logRefreshAttempt(supabase, false, "Failed to retrieve credentials from database", sessionId);
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to retrieve Fortnox credentials" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Extract and validate credentials
    const credentials = settingsData.settings;
    
    console.log(`[${sessionId}] 🧐 Credentials structure check:`, {
      hasClientId: !!credentials?.clientId,
      hasClientSecret: !!credentials?.clientSecret,
      hasAccessToken: !!credentials?.accessToken,
      hasRefreshToken: !!credentials?.refreshToken,
      clientIdLength: credentials?.clientId?.length || 0,
      clientSecretLength: credentials?.clientSecret?.length || 0,
      accessTokenLength: credentials?.accessToken?.length || 0,
      refreshTokenLength: credentials?.refreshToken?.length || 0
    });
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.error(`[${sessionId}] ❌ Invalid or incomplete credentials in database:`, {
        clientIdExists: !!credentials?.clientId,
        clientSecretExists: !!credentials?.clientSecret,
        refreshTokenExists: !!credentials?.refreshToken
      });
      
      await logRefreshAttempt(supabase, false, "Incomplete credentials found in database", sessionId);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_credentials", 
          message: "Incomplete Fortnox credentials",
          details: {
            clientIdExists: !!credentials?.clientId,
            clientSecretExists: !!credentials?.clientSecret,
            refreshTokenExists: !!credentials?.refreshToken
          },
          requiresReconnect: true
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Check if token refresh is needed
    const shouldRefresh = force || !credentials.accessToken || 
                         !isValidJwtFormat(credentials.accessToken) || 
                         tokenNeedsRefresh(credentials.accessToken);
    
    if (!shouldRefresh) {
      console.log(`[${sessionId}] ✅ Token is still valid with more than 30 minutes remaining. No refresh needed.`);
      
      // Log the skipped refresh
      await logRefreshAttempt(
        supabase, 
        true, 
        "Token refresh skipped - token still valid with >30 minutes remaining", 
        sessionId
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Token is still valid. No refresh needed.",
          tokenLength: credentials.accessToken.length,
          session_id: sessionId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Make sure the refresh token is the correct length (40 chars for Fortnox)
    if (credentials.refreshToken.length !== 40) {
      console.warn(`[${sessionId}] ⚠️ Refresh token length (${credentials.refreshToken.length}) doesn't match expected 40 chars`);
    }
    
    // Log the current refresh token details (for debugging)
    console.log(`[${sessionId}] 🔑 Using refresh token:`, credentials.refreshToken);
    console.log(`[${sessionId}] 🔍 Current refresh token details:`, {
      length: credentials.refreshToken.length,
      preview: `${credentials.refreshToken.substring(0, 10)}...${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}`,
      isString: typeof credentials.refreshToken === 'string',
      valid: isValidRefreshToken(credentials.refreshToken)
    });
    
    console.log(`[${sessionId}] 💬 Refreshing with:`, { 
      clientId: credentials.clientId,
      clientSecretLength: credentials.clientSecret.length,
      refreshToken: credentials.refreshToken
    });
    
    // Prepare form data for token refresh using URLSearchParams
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', credentials.refreshToken);
    
    // Create the Authorization header with Basic auth
    const authString = `${credentials.clientId}:${credentials.clientSecret}`;
    const base64Auth = btoa(authString);
    const authHeader = `Basic ${base64Auth}`;
    
    console.log(`[${sessionId}] 🔄 Making token refresh request to Fortnox with:`, {
      url: FORTNOX_TOKEN_URL,
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      authHeader: 'Basic ***',
      formData: Object.fromEntries(formData.entries()),
      refreshTokenLength: credentials.refreshToken.length
    });
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': authHeader
      },
      body: formData,
    });
    
    // Get and parse response
    const responseText = await response.text();
    console.log(`[${sessionId}] 📬 Fortnox response status:`, response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`[${sessionId}] ✅ Successfully parsed Fortnox response`);
      console.log(`[${sessionId}] 📋 Fortnox response data:`, responseData);
    } catch (e) {
      console.error(`[${sessionId}] ❌ Failed to parse Fortnox response:`, e);
      console.log(`[${sessionId}] 📝 Raw response text:`, responseText);
      
      await logRefreshAttempt(supabase, false, "Invalid response from Fortnox API", sessionId);
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_response", 
          message: "Invalid response from Fortnox",
          raw: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!response.ok) {
      console.error(`[${sessionId}] ❌ Fortnox API error:`, responseData);
      
      await logRefreshAttempt(
        supabase, 
        false, 
        `Fortnox API error: ${responseData.error || 'Unknown error'} - ${responseData.error_description || ''}`, 
        sessionId
      );
      
      // For invalid_grant (refresh token expired/invalid), we handle this
      // by telling the client they need to reconnect
      if (responseData.error === 'invalid_grant') {
        return new Response(
          JSON.stringify({ 
            error: responseData.error, 
            message: "Refresh token is invalid or expired. Please reconnect to Fortnox.",
            details: responseData,
            requiresReconnect: true
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: responseData.error, 
          message: responseData.error_description || "Token refresh failed",
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate received tokens
    if (!responseData.access_token || !isValidJwtFormat(responseData.access_token)) {
      console.error(`[${sessionId}] ❌ Invalid access token format received from Fortnox`);
      
      await logRefreshAttempt(supabase, false, "Received invalid access token format", sessionId);
      
      return new Response(
        JSON.stringify({
          error: "invalid_token_format",
          message: "Received invalid access token format from Fortnox",
          requiresReconnect: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Detailed token logging
    console.log(`[${sessionId}] 🧪 access_token length:`, responseData.access_token?.length);
    console.log(`[${sessionId}] 🧪 refresh_token length:`, responseData.refresh_token?.length);
    console.log(`[${sessionId}] 🧪 access_token preview:`, `${responseData.access_token?.slice(0, 20)}...${responseData.access_token?.slice(-20)}`);
    if (responseData.refresh_token) {
      console.log(`[${sessionId}] 🧪 refresh_token preview:`, `${responseData.refresh_token?.slice(0, 10)}...${responseData.refresh_token?.slice(-5)}`);
    }
    
    // Create a clean, minimalist credentials object with only the necessary fields
    // IMPORTANT: Only update the refresh token if Fortnox provides a new one
    const updatedCredentials = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      accessToken: responseData.access_token,
      // Only update refresh token if a new one is provided, otherwise keep the existing one
      refreshToken: responseData.refresh_token || credentials.refreshToken,
      isLegacyToken: false
    };
    
    // Add token expiration information - parse JWT to extract expiration
    if (responseData.access_token) {
      try {
        const tokenParts = responseData.access_token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.exp) {
            // Convert Unix timestamp to ISO date
            updatedCredentials.expiresAt = new Date(payload.exp * 1000).toISOString();
            console.log(`[${sessionId}] 🕒 Token expires at: ${updatedCredentials.expiresAt}`);
          }
        }
      } catch (err) {
        console.error(`[${sessionId}] Error parsing JWT token:`, err);
      }
    }
    
    // Verify we're not storing a truncated token
    console.log(`[${sessionId}] ✅ Verification - Access token type check:`, typeof updatedCredentials.accessToken === 'string');
    console.log(`[${sessionId}] ✅ Verification - Access token length check:`, updatedCredentials.accessToken.length);
    console.log(`[${sessionId}] ✅ Verification - Refresh token type check:`, typeof updatedCredentials.refreshToken === 'string');
    console.log(`[${sessionId}] ✅ Verification - Refresh token length check:`, updatedCredentials.refreshToken.length);
    
    if (typeof updatedCredentials.accessToken !== 'string' || 
        updatedCredentials.accessToken.length < 100) {
      console.error(`[${sessionId}] ❌ Token validation failed - suspiciously short access token`);
      
      await logRefreshAttempt(supabase, false, "Token validation failed - suspiciously short access token", sessionId, updatedCredentials.accessToken.length);
      
      return new Response(
        JSON.stringify({
          error: "token_validation_failed",
          message: "Refusing to save suspiciously short access token",
          requiresReconnect: true
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Save updated credentials
    console.log(`[${sessionId}] 💾 Saving updated credentials to database`);
    console.log(`[${sessionId}] 💾 Access token length:`, updatedCredentials.accessToken.length);
    console.log(`[${sessionId}] 💾 Refresh token length:`, updatedCredentials.refreshToken.length);
    
    // Serialize credentials separately to ensure full data integrity 
    const stringifiedSettings = JSON.stringify(updatedCredentials);
    console.log(`[${sessionId}] 📐 Stringified settings length:`, stringifiedSettings.length);
    
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: updatedCredentials
      }, {
        onConflict: 'id'
      });
      
    if (updateError) {
      console.error(`[${sessionId}] ❌ Error updating credentials in database:`, updateError);
      
      await logRefreshAttempt(supabase, false, "Failed to update tokens in database", sessionId, updatedCredentials.accessToken.length);
      
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to update tokens in database",
          details: updateError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Add a small delay to ensure database consistency
    await delay(500);
    
    // Double-check that the tokens were saved correctly
    const { data: verifyData, error: verifyError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
      
    if (verifyError) {
      console.error(`[${sessionId}] ❌ Error verifying updated credentials:`, verifyError);
    } else if (verifyData && verifyData.settings) {
      const settings = verifyData.settings;
      
      console.log(`[${sessionId}] ✅ Verification - Saved access token length:`, settings.accessToken.length);
      console.log(`[${sessionId}] ✅ Verification - Saved refresh token length:`, settings.refreshToken.length);
      console.log(`[${sessionId}] ✅ Verification - First 20 chars of access token match:`, 
        settings.accessToken.substring(0, 20) === updatedCredentials.accessToken.substring(0, 20));
      console.log(`[${sessionId}] ✅ Verification - Last 20 chars of access token match:`,
        settings.accessToken.substring(settings.accessToken.length - 20) === 
        updatedCredentials.accessToken.substring(updatedCredentials.accessToken.length - 20));
      
      if (settings.accessToken.length !== updatedCredentials.accessToken.length) {
        console.error(
          `[${sessionId}] ⚠️ Token length mismatch after save! ` +
          `Original: ${updatedCredentials.accessToken.length}, ` +
          `Saved: ${settings.accessToken.length}`
        );
      }
      
      if (settings.refreshToken.length !== updatedCredentials.refreshToken.length) {
        console.error(
          `[${sessionId}] ⚠️ Refresh token length mismatch after save! ` +
          `Original: ${updatedCredentials.refreshToken.length}, ` +
          `Saved: ${settings.refreshToken.length}`
        );
      }
    }
    
    console.log(`[${sessionId}] ✅ Token refresh completed successfully`);
    
    // Log the successful refresh
    await logRefreshAttempt(
      supabase, 
      true, 
      "Token refresh completed successfully", 
      sessionId, 
      updatedCredentials.accessToken.length
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refresh completed successfully",
        tokenLength: updatedCredentials.accessToken.length,
        session_id: sessionId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error(`[${sessionId}] ❌ Server error in token refresh:`, error);
    
    // Try to log the error
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await logRefreshAttempt(
          supabase, 
          false, 
          `Server error: ${error.message || "Unknown error"}`, 
          sessionId
        );
      } catch (logError) {
        console.error(`[${sessionId}] Failed to log error:`, logError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
