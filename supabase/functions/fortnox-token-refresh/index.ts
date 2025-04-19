import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment (for database access)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Fixed CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("Starting Fortnox token refresh process");
    
    // Get client credentials - either from request or directly from database
    let requestData;
    let clientId;
    let clientSecret;
    let refreshToken;
    
    // Two authentication modes:
    // 1. API key for system-level refresh (cron job or scheduled task)
    // 2. Direct request with provided credentials (from frontend)
    
    // Check for API key authentication first (system-level access)
    const apiKey = req.headers.get("x-api-key");
    const validKey = Deno.env.get("FORTNOX_REFRESH_SECRET");
    
    console.log("Authentication check:", {
      apiKeyPresent: !!apiKey,
      validKeyPresent: !!validKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      validKeyLength: validKey ? validKey.length : 0,
      requestMethod: req.method,
      contentType: req.headers.get("content-type"),
      headersPresent: Array.from(req.headers.keys()),
    });
    
    const isSystemAuthenticated = validKey && apiKey === validKey;
    
    // If this is a system-level authenticated request, get credentials from database
    if (isSystemAuthenticated) {
      console.log("System-level authentication successful");
      
      // Initialize Supabase client with service role for direct database access
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Supabase URL or service key not configured");
        return new Response(
          JSON.stringify({ 
            error: "server_configuration_error", 
            message: "Server is not properly configured for system-level refresh" 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Create Supabase client with admin privileges
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
            message: "Failed to retrieve Fortnox credentials from database",
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
            message: "Invalid or incomplete Fortnox credentials in database" 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Set variables from database credentials
      clientId = credentials.clientId;
      clientSecret = credentials.clientSecret;
      refreshToken = credentials.refreshToken;
      
      console.log("Successfully retrieved credentials from database");
    } 
    // Otherwise, parse credentials from request body
    else {
      // Validate API key if the environment has one configured
      if (validKey && !isSystemAuthenticated) {
        console.error("Invalid API key provided", {
          apiKeyProvided: apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'missing',
          validKeyHint: validKey ? `${validKey.substring(0, 3)}...${validKey.substring(validKey.length - 3)}` : 'missing',
        });
        
        return new Response(
          JSON.stringify({ 
            error: "unauthorized", 
            message: "Invalid API key provided"
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // If no API key is required (or not configured), parse the request body
      try {
        requestData = await req.json();
        console.log("Parsing request data:", {
          hasRefreshToken: !!requestData.refresh_token,
          hasClientId: !!requestData.client_id,
          hasClientSecret: !!requestData.client_secret
        });
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return new Response(
          JSON.stringify({ error: "Invalid request body - could not parse JSON" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Validate required fields
      if (!requestData.client_id || !requestData.client_secret || !requestData.refresh_token) {
        const missingFields = [];
        if (!requestData.client_id) missingFields.push('client_id');
        if (!requestData.client_secret) missingFields.push('client_secret');
        if (!requestData.refresh_token) missingFields.push('refresh_token');
        
        console.error(`Missing required parameters: ${missingFields.join(', ')}`);
        
        return new Response(
          JSON.stringify({ 
            error: "Missing required parameters",
            details: {
              missing: missingFields
            }
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Set variables from request body
      clientId = requestData.client_id;
      clientSecret = requestData.client_secret;
      refreshToken = requestData.refresh_token;
    }
    
    // Log token refresh attempt (obfuscate sensitive data)
    console.log("Processing token refresh with:", {
      clientIdLength: clientId.length,
      clientSecretLength: clientSecret.length,
      refreshTokenLength: refreshToken.length,
      clientIdPrefix: clientId.substring(0, 3) + '...',
      refreshTokenPrefix: refreshToken.substring(0, 3) + '...',
    });
    
    // Prepare the form data for token refresh
    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
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
    
    // Get the response body
    const responseText = await response.text();
    console.log("Fortnox response status:", response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
      
      // Log the structure of the response (without revealing sensitive data)
      console.log("Response structure:", {
        has_access_token: !!responseData.access_token,
        has_refresh_token: !!responseData.refresh_token,
        has_expires_in: !!responseData.expires_in,
        expires_in_value: responseData.expires_in,
        token_type: responseData.token_type
      });
    } catch (e) {
      console.error("Failed to parse Fortnox response as JSON:", e, "Raw response:", responseText);
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
      
      // Add specific detection for invalid/expired refresh token
      if (responseData.error === 'invalid_grant' && 
          responseData.error_description === 'Invalid refresh token') {
        return new Response(
          JSON.stringify({ 
            error: "refresh_token_invalid", 
            error_description: "The refresh token is no longer valid. User needs to reconnect to Fortnox.",
            status: response.status,
            details: responseData
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
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
    
    // If this was a system-level request, update the database with new tokens
    if (isSystemAuthenticated && supabaseUrl && supabaseServiceKey) {
      console.log("Updating tokens in database");
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get current credentials
      const { data: currentData } = await supabase
        .from('system_settings')
        .select('settings')
        .eq('id', 'fortnox_credentials')
        .maybeSingle();
      
      if (currentData && currentData.settings) {
        // Calculate expiration times
        const expiresAt = Date.now() + (responseData.expires_in || 3600) * 1000;
        const refreshTokenExpiresAt = Date.now() + (45 * 24 * 60 * 60 * 1000); // 45 days
        
        // Update with new tokens
        const updatedCredentials = {
          ...currentData.settings,
          accessToken: responseData.access_token,
          refreshToken: responseData.refresh_token || refreshToken, // Use new refresh token if provided
          expiresAt,
          expiresIn: responseData.expires_in,
          refreshTokenExpiresAt,
          refreshFailCount: 0, // Reset failure count on successful refresh
          lastRefreshAttempt: Date.now()
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
          // Continue to return the tokens even if database update fails
        } else {
          console.log("Successfully updated tokens in database");
        }
      }
    }
    
    console.log("Token refresh successful, returning response");
    
    // Return the token data
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-token-refresh:", error);
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error.message || "Unknown error",
        stack: error.stack || "No stack trace"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
