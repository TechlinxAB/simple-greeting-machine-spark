
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const refreshSecret = Deno.env.get('FORTNOX_REFRESH_SECRET') || '';

// Fortnox token refresh endpoint
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// This function handles scheduled refreshes of Fortnox tokens
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Generate a session ID for tracing this refresh session
  const sessionId = crypto.randomUUID().substring(0, 8);
  console.log(`[${sessionId}] ===== SCHEDULED TOKEN REFRESH STARTED =====`);
  
  try {
    // Validate authentication
    const apiKey = req.headers.get("x-api-key");
    const validKey = refreshSecret;
    
    if (!validKey || apiKey !== validKey) {
      console.error(`[${sessionId}] Unauthorized: Invalid API key`);
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[${sessionId}] API key validation successful`);
    
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log(`[${sessionId}] Request data:`, { 
        scheduled: requestData.scheduled, 
        force: requestData.force 
      });
    } catch (e) {
      requestData = {};
      console.log(`[${sessionId}] No request body or invalid JSON`);
    }
    
    // Create Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${sessionId}] Missing Supabase configuration`);
      return new Response(
        JSON.stringify({ error: "configuration_error", message: "Missing Supabase configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get credentials from the database
    console.log(`[${sessionId}] Retrieving Fortnox credentials from database`);
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('settings')
      .eq('id', 'fortnox_credentials')
      .maybeSingle();
    
    if (settingsError || !settingsData) {
      console.error(`[${sessionId}] Error retrieving Fortnox credentials:`, settingsError);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: `Error retrieving credentials: ${settingsError?.message || 'No credentials found'}`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "database_error", 
          message: "Failed to retrieve Fortnox credentials",
          details: settingsError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract and validate credentials
    const credentials = settingsData.settings;
    
    if (!credentials || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
      console.error(`[${sessionId}] Invalid or incomplete credentials in database`);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: `Invalid or incomplete credentials`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "invalid_credentials", 
          message: "Invalid or incomplete Fortnox credentials" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check if token is already expired or force refresh is requested
    const now = Date.now();
    const expiresAt = credentials.expiresAt || 0;
    const refreshNeeded = now >= expiresAt - (5 * 60 * 1000); // 5 minutes buffer
    
    if (!refreshNeeded && !requestData.force) {
      console.log(`[${sessionId}] Token is still valid. No refresh needed.`);
      return new Response(
        JSON.stringify({ 
          message: "Token is still valid", 
          expiresIn: Math.floor((expiresAt - now) / 1000),
          expiresAt
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Refresh the token
    console.log(`[${sessionId}] Refreshing token...`);
    
    // Prepare the form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
    });
    
    // Make request to Fortnox
    const response = await fetch(FORTNOX_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    // Get the response body
    const responseText = await response.text();
    console.log(`[${sessionId}] Fortnox response status:`, response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log(`[${sessionId}] Successfully parsed Fortnox response`);
    } catch (e) {
      console.error(`[${sessionId}] Failed to parse Fortnox response:`, e);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: `Failed to parse Fortnox response: ${e.message}`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "parsing_error", 
          message: "Failed to parse Fortnox response", 
          rawResponse: responseText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Handle error response from Fortnox
    if (!response.ok) {
      console.error(`[${sessionId}] Fortnox API error:`, response.status, responseData);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: false,
          message: `Fortnox API error: ${responseData.error_description || responseData.error || 'Unknown error'}`,
          token_length: 0
        });
      
      return new Response(
        JSON.stringify({ 
          error: "fortnox_api_error", 
          status: response.status,
          details: responseData
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update credentials in the database
    console.log(`[${sessionId}] Token refresh successful, updating database`);
    
    // Calculate expiration times
    const expiresIn = responseData.expires_in || 3600;
    const newExpiresAt = Date.now() + expiresIn * 1000;
    const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000); // 45 days
    
    const updatedCredentials = {
      ...credentials,
      accessToken: responseData.access_token,
      refreshToken: responseData.refresh_token || credentials.refreshToken, // Use new refresh token if provided
      expiresAt: newExpiresAt,
      expiresIn: expiresIn,
      refreshTokenExpiresAt,
      refreshFailCount: 0, // Reset failure count on successful refresh
      lastRefreshAttempt: Date.now(),
      lastRefreshSuccess: Date.now()
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
      console.error(`[${sessionId}] Error updating credentials in database:`, updateError);
      
      // Log the refresh attempt
      await supabase
        .from('token_refresh_logs')
        .insert({
          session_id: sessionId,
          success: true,
          message: `Token refreshed successfully but failed to update database: ${updateError.message}`,
          token_length: responseData.access_token.length
        });
      
      return new Response(
        JSON.stringify({ 
          warning: "database_update_error", 
          message: "Token refreshed but failed to update database",
          details: updateError,
          tokenInfo: {
            expiresIn: expiresIn,
            expiresAt: newExpiresAt
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Log the successful refresh
    await supabase
      .from('token_refresh_logs')
      .insert({
        session_id: sessionId,
        success: true,
        message: `Token refreshed successfully`,
        token_length: responseData.access_token.length
      });
    
    console.log(`[${sessionId}] Token refresh completed successfully`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refreshed successfully",
        expiresIn: expiresIn,
        expiresAt: newExpiresAt
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error(`[${sessionId}] Unexpected error in scheduled refresh:`, error);
    
    // Try to log the error if possible
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('token_refresh_logs')
          .insert({
            session_id: sessionId,
            success: false,
            message: `Unexpected error: ${error.message || 'Unknown error'}`,
            token_length: 0
          });
      } catch (logError) {
        console.error(`[${sessionId}] Failed to log error:`, logError);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
