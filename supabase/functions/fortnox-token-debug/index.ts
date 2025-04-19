
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { corsHeaders } from "../_shared/cors.ts";

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// This function provides a debug endpoint to verify token state
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  try {
    console.log("🔍 Running Fortnox token debug endpoint");
    
    // Authentication check
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "server_configuration_error", message: "Server configuration incomplete" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get Fortnox credentials from database
    console.log("📚 Retrieving Fortnox credentials for debug");
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
          message: "Failed to retrieve Fortnox credentials",
          details: settingsError
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract credentials
    const credentials = settingsData.settings;
    
    // Create safe debug output that doesn't expose full tokens
    const debugInfo = {
      accessTokenPresent: !!credentials?.accessToken,
      accessTokenLength: credentials?.accessToken?.length || 0,
      refreshTokenPresent: !!credentials?.refreshToken,
      refreshTokenLength: credentials?.refreshToken?.length || 0,
      clientIdPresent: !!credentials?.clientId,
      clientIdLength: credentials?.clientId?.length || 0,
      clientSecretPresent: !!credentials?.clientSecret,
      clientSecretLength: credentials?.clientSecret?.length || 0,
      accessTokenPreview: credentials?.accessToken 
        ? `${credentials.accessToken.substring(0, 10)}...${credentials.accessToken.substring(credentials.accessToken.length - 10)}`
        : 'missing',
      refreshTokenPreview: credentials?.refreshToken
        ? `${credentials.refreshToken.substring(0, 5)}...${credentials.refreshToken.substring(credentials.refreshToken.length - 5)}`
        : 'missing',
      rawSettingsType: typeof settingsData.settings,
      settingsKeys: Object.keys(settingsData.settings || {}),
      timestamp: new Date().toISOString()
    };
    
    console.log("✅ Debug info generated:", {
      accessTokenLength: debugInfo.accessTokenLength,
      refreshTokenLength: debugInfo.refreshTokenLength,
      clientIdLength: debugInfo.clientIdLength,
      timestamp: debugInfo.timestamp
    });
    
    return new Response(
      JSON.stringify(debugInfo),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in debug endpoint:", error);
    return new Response(
      JSON.stringify({ error: "server_error", message: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
