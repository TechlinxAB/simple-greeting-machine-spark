
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
    console.log("Starting Fortnox token refresh process");
    
    // Parse request body if it exists
    let force = false;
    try {
      const body = await req.json();
      force = !!body.force;
      console.log("Request body:", { force });
    } catch (e) {
      console.log("No valid request body found");
    }
    
    // Authentication check
    const apiKey = req.headers.get("x-api-key");
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");

    console.log("Authentication check:", {
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
      console.error("Supabase configuration missing");
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
    console.log("Retrieving Fortnox credentials from database");
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error("Error retrieving Fortnox credentials:", settingsError);
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
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.error("Invalid or incomplete credentials in database");
      return new Response(
        JSON.stringify({ 
          error: "invalid_credentials", 
          message: "Incomplete Fortnox credentials" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Prepare form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    });
    
    console.log("Making token refresh request to Fortnox");
    
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
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response");
    } catch (e) {
      console.error("Failed to parse Fortnox response:", e);
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
      console.error("Fortnox API error:", responseData);
      
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
    
    // Update credentials with new tokens only
    const updatedCredentials = {
      ...credentials,
      accessToken: responseData.access_token,
      refreshToken: responseData.refresh_token || credentials.refreshToken
    };
    
    // Save updated credentials
    const { error: updateError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'fortnox_credentials',
        settings: updatedCredentials
      }, {
        onConflict: 'id'
      });
      
    if (updateError) {
      console.error("Error updating credentials in database:", updateError);
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
    
    console.log("Token refresh completed successfully");
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refresh completed successfully"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Server error in token refresh:", error);
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
