import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { jwtVerify } from "https://deno.land/x/jose@v4.14.4/index.ts";

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

// Utility function to validate access token structure
function isValidJwtFormat(token) {
  if (typeof token !== 'string') return false;
  if (token.length < 20) return false; // Arbitrary minimum length
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
}

// Utility function to validate refresh token
function isValidRefreshToken(token) {
  return typeof token === 'string' && token.trim().length > 20;
}

// This function will be called by a scheduled cron job or manually
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("🚀 Starting Fortnox token refresh process");
    
    // Parse request body if it exists
    let force = false;
    try {
      const body = await req.json();
      force = !!body.force;
      console.log("📝 Request body:", { force });
    } catch (e) {
      console.log("⚠️ No valid request body found");
    }
    
    // Authentication check
    const apiKey = req.headers.get("x-api-key");
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");

    console.log("🔐 Authentication check:", {
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
        console.log("✅ JWT manually validated via jose, user ID:", payload.sub);
        userAuthenticated = true;
      } catch (err) {
        console.error("❌ JWT verification failed (via jose):", err);
      }
    }
    
    const isAuthenticated = isSystemAuthenticated || userAuthenticated;
    
    if (!isAuthenticated) {
      console.error("❌ Unauthorized access to Fortnox token refresh");
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
    
    console.log("✅ Authentication successful:", {
      systemAuth: isSystemAuthenticated,
      userAuth: userAuthenticated
    });
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase configuration missing");
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
    console.log("📚 Retrieving Fortnox credentials from database");
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error("❌ Error retrieving Fortnox credentials:", settingsError);
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
    
    console.log("🧐 Credentials structure check:", {
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
      console.error("❌ Invalid or incomplete credentials in database:", {
        clientIdExists: !!credentials?.clientId,
        clientSecretExists: !!credentials?.clientSecret,
        refreshTokenExists: !!credentials?.refreshToken
      });
      
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
    
    // Log the current refresh token details (for debugging)
    console.log("🔑 Using refresh token:", credentials.refreshToken);
    console.log("🔍 Current refresh token details:", {
      length: credentials.refreshToken.length,
      preview: `${credentials.refreshToken.substring(0, 10)}...${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}`,
      isString: typeof credentials.refreshToken === 'string',
      valid: isValidRefreshToken(credentials.refreshToken)
    });
    
    console.log("💬 Refreshing with:", { 
      clientId: credentials.clientId,
      clientSecretLength: credentials.clientSecret.length,
      refreshToken: credentials.refreshToken
    });
    
    // Prepare form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    });
    
    console.log("🔄 Making token refresh request to Fortnox with:", {
      url: FORTNOX_TOKEN_URL,
      method: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      formDataKeys: Array.from(formData.keys()),
      refreshTokenLength: credentials.refreshToken.length
    });
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get and parse response
    const responseText = await response.text();
    console.log("📬 Fortnox response status:", response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("✅ Successfully parsed Fortnox response");
      console.log("📋 Fortnox response data:", responseData);
    } catch (e) {
      console.error("❌ Failed to parse Fortnox response:", e);
      console.log("📝 Raw response text:", responseText);
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
      console.error("❌ Fortnox API error:", responseData);
      
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
      console.error("❌ Invalid access token format received from Fortnox");
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
    console.log("🧪 access_token length:", responseData.access_token?.length);
    console.log("🧪 refresh_token length:", responseData.refresh_token?.length);
    console.log("🧪 access_token preview:", `${responseData.access_token?.slice(0, 20)}...${responseData.access_token?.slice(-20)}`);
    if (responseData.refresh_token) {
      console.log("🧪 refresh_token preview:", `${responseData.refresh_token?.slice(0, 10)}...${responseData.refresh_token?.slice(-5)}`);
    }
    
    // Create a clean, minimalist credentials object with only the necessary fields
    // IMPORTANT: Only update the refresh token if Fortnox provides a new one
    const updatedCredentials = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      accessToken: responseData.access_token,
      // Only update refresh token if a new one is provided, otherwise keep the existing one
      refreshToken: responseData.refresh_token || credentials.refreshToken
    };
    
    // Verify we're not storing a truncated token
    console.log("✅ Verification - Access token type check:", typeof updatedCredentials.accessToken === 'string');
    console.log("✅ Verification - Access token length check:", updatedCredentials.accessToken.length);
    console.log("✅ Verification - Refresh token type check:", typeof updatedCredentials.refreshToken === 'string');
    console.log("✅ Verification - Refresh token length check:", updatedCredentials.refreshToken.length);
    
    if (typeof updatedCredentials.accessToken !== 'string' || 
        updatedCredentials.accessToken.length < 100) {
      console.error("❌ Token validation failed - suspiciously short access token");
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
    console.log("💾 Saving updated credentials to database");
    console.log("💾 Access token length:", updatedCredentials.accessToken.length);
    console.log("💾 Refresh token length:", updatedCredentials.refreshToken.length);
    
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: updatedCredentials
      }, {
        onConflict: 'id'
      });
      
    if (updateError) {
      console.error("❌ Error updating credentials in database:", updateError);
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
    
    // Double-check that the tokens were saved correctly
    const { data: verifyData } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
      
    if (verifyData && verifyData.settings) {
      console.log("✅ Verification - Saved access token length:", verifyData.settings.accessToken.length);
      console.log("✅ Verification - Saved refresh token length:", verifyData.settings.refreshToken.length);
      console.log("✅ Verification - First 20 chars of access token match:", 
        verifyData.settings.accessToken.substring(0, 20) === updatedCredentials.accessToken.substring(0, 20));
      console.log("✅ Verification - Last 20 chars of access token match:",
        verifyData.settings.accessToken.substring(verifyData.settings.accessToken.length - 20) === 
        updatedCredentials.accessToken.substring(updatedCredentials.accessToken.length - 20));
    }
    
    console.log("✅ Token refresh completed successfully");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refresh completed successfully",
        tokenLength: updatedCredentials.accessToken.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("❌ Server error in token refresh:", error);
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
