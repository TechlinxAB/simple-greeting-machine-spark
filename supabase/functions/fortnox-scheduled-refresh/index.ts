
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Fixed API key - matching the one in the cron job
// This allows the function to verify system-level requests
const SYSTEM_API_KEY = 'fortnox-refresh-secret-key-xojrleypudfrbmvejpow';

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// This function will be called by a scheduled cron job
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Starting scheduled Fortnox token refresh");
    
    // Parse request body if it exists
    let force = false;
    try {
      const body = await req.json();
      force = !!body.force;
      console.log("Request body:", { force });
    } catch (e) {
      // No body or invalid JSON - that's okay for this endpoint
      console.log("No valid request body found");
    }
    
    // Get both authorization methods
    const apiKey = req.headers.get("x-api-key");
    const authHeader = req.headers.get("Authorization");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");

    console.log("Authentication check:", {
      authHeaderPresent: !!authHeader,
      apiKeyPresent: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      validKeyLength: validKey ? validKey.length : 0,
    });
    
    // Check for system-level authentication via API key
    const isSystemAuthenticated = validKey && apiKey === validKey;

    // Check for user authentication via JWT
    let userAuthenticated = false;

    if (!isSystemAuthenticated && authHeader?.startsWith("Bearer ")) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

      const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey!, {
        global: {
          headers: {
            Authorization: authHeader!,
          },
        },
      });

      const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser();

      if (userData?.user && !userError) {
        console.log("✅ Authenticated via Supabase JWT:", userData.user.id);
        userAuthenticated = true;
      } else {
        console.warn("❌ Supabase JWT auth failed", userError);
      }
    }

    // Final authentication check - either system or user auth must succeed
    const isAuthenticated = isSystemAuthenticated || userAuthenticated;

    if (!isAuthenticated) {
      console.error("❌ Unauthorized access to Fortnox scheduled refresh");
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing or invalid API key or user token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Supabase client with service role
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase URL or service key not configured");
      return new Response(
        JSON.stringify({ 
          error: "server_configuration_error", 
          message: "Server is not properly configured for database access" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox credentials from system_settings table
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
          message: "Failed to retrieve Fortnox credentials",
          details: settingsError
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Extract credentials from settings
    const credentials = settingsData.settings;
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.error("Invalid or incomplete credentials in database");
      return new Response(
        JSON.stringify({ 
          error: "invalid_credentials", 
          message: "Invalid or incomplete Fortnox credentials" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Check if token needs refreshing
    // Refresh if explicitly forced or if less than 7 days remaining
    const expiresInMs = credentials.expiresAt ? credentials.expiresAt - Date.now() : 0;
    const expiresInDays = expiresInMs / (1000 * 60 * 60 * 24);
    const needsRefresh = force || !credentials.expiresAt || expiresInDays < 7;
    
    console.log("Token status:", {
      expiresInDays: Math.round(expiresInDays * 10) / 10,
      forceRefresh: force,
      needsRefresh: needsRefresh
    });
    
    // If token doesn't need refreshing yet, return early
    if (!needsRefresh) {
      return new Response(
        JSON.stringify({ 
          message: "Token doesn't need refreshing yet",
          daysRemaining: Math.round(expiresInDays * 10) / 10
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Prepare the form data
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    });
    
    console.log("Making scheduled token refresh request to Fortnox");
    
    // Make the request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response");
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // If the response is not OK, return the error
    if (!response.ok) {
      console.error("Fortnox API error:", response.status, responseData);
      
      // If refresh token is invalid, mark it in the database
      if (responseData.error === 'invalid_grant' && 
          responseData.error_description === 'Invalid refresh token') {
        
        // Update credentials to indicate refresh token is invalid
        const updatedCredentials = {
          ...credentials,
          refreshFailCount: (credentials.refreshFailCount || 0) + 1,
          lastRefreshAttempt: Date.now(),
          refreshTokenInvalid: true
        };
        
        // Save the updated credentials
        const { error: updateError } = await supabase
          .from('system_settings')
          .upsert({
            id: 'fortnox_credentials',
            settings: updatedCredentials
          }, {
            onConflict: 'id'
          });
          
        if (updateError) {
          console.error("Error updating invalid token status:", updateError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: "fortnox_api_error", 
          status: response.status,
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Token refresh successful, update the database
    console.log("Scheduled token refresh successful");
    
    // Calculate token expiration time
    const expiresAt = Date.now() + (responseData.expires_in || 3600) * 1000;
    
    // Set refresh token expiration to 45 days from now
    const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000);
    
    // Update credentials with new tokens
    const updatedCredentials = {
      ...credentials,
      accessToken: responseData.access_token,
      refreshToken: responseData.refresh_token || credentials.refreshToken,
      expiresAt,
      expiresIn: responseData.expires_in,
      refreshTokenExpiresAt,
      refreshFailCount: 0,
      lastRefreshAttempt: Date.now(),
      refreshTokenInvalid: false
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
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Scheduled token refresh completed successfully",
        expiresAt: new Date(expiresAt).toISOString(),
        expiresIn: responseData.expires_in
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
  } catch (error) {
    console.error("Server error in scheduled token refresh:", error);
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
