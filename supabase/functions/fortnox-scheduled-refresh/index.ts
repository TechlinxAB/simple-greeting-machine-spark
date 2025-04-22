import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';
import { jwtVerify, decodeJwt } from "https://deno.land/x/jose@v4.14.4/index.ts";

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Get Supabase configuration from environment
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const jwtSecret = Deno.env.get('JWT_SECRET');
const dbPassword = Deno.env.get('DB_PASSWORD');
const dbUrl = Deno.env.get('DB_URL');

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

// Log environment variables availability (without exposing values)
function logEnvironmentStatus() {
  console.log("Environment variables status check:", {
    supabaseUrlPresent: !!supabaseUrl,
    supabaseServiceKeyPresent: !!supabaseServiceKey,
    jwtSecretPresent: !!jwtSecret,
    dbPasswordPresent: !!dbPassword,
    dbUrlPresent: !!dbUrl,
    supabaseUrlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) + "..." : "missing",
    dbUrlPrefix: dbUrl ? dbUrl.substring(0, 10) + "..." : "missing"
  });
}

// Log database connection details
function logDatabaseDetails() {
  if (!dbUrl) {
    console.error("DB_URL is missing - database operations will fail");
    return;
  }
  
  console.log("Database URL pattern analysis:", {
    hasPasswordPlaceholder: dbUrl.includes(":password@"),
    hasPasswordParam: dbUrl.includes("password="),
    urlFormat: dbUrl.startsWith("postgres") ? "postgres://" : "other"
  });
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
  
  // Always refresh if less than 30 minutes remaining
  return timeRemaining < thirtyMinutesInSeconds;
}

// Helper to check if token is expired
function isTokenExpired(token: string): boolean {
  const expTime = getTokenExpirationTime(token);
  if (!expTime) return true; // If we can't determine expiration, assume expired
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return now >= expTime;
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
    
    // Log environment status at the start
    logEnvironmentStatus();
    logDatabaseDetails();
    
    // Parse request body if it exists
    let force = false;
    let automatic = false;
    try {
      const body = await req.json();
      force = !!body.force;
      automatic = !!body.automatic;
      console.log(`[${sessionId}] 📝 Request body:`, { force, automatic, scheduled: !!body.scheduled });
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
      validKeyPresent: !!validKey,
      validKeyLength: validKey ? validKey.length : 0,
      jwtSecretPresent: !!jwtSecret,
      isAutomaticRefresh: automatic
    });
    
    // Initialize Supabase client
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${sessionId}] ❌ Supabase configuration missing`);
      return new Response(
        JSON.stringify({ 
          error: "server_configuration_error", 
          message: "Server configuration incomplete",
          details: {
            supabaseUrlPresent: !!supabaseUrl,
            supabaseServiceKeyPresent: !!supabaseServiceKey
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // For now, we'll just log the attempt to verify environment is working
    await logRefreshAttempt(
      supabase,
      true,
      "Environment verification test successful",
      sessionId
    );
    
    console.log(`[${sessionId}] ✅ Fortnox token refresh environment check completed successfully`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Environment verification successful",
        environment: {
          supabaseAvailable: true,
          dbPasswordSet: !!dbPassword,
          dbUrlSet: !!dbUrl,
          sessionId: sessionId
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error(`[${sessionId}] ❌ Server error in token refresh environment check:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: error instanceof Error ? error.message : "Unknown error",
        environment: {
          supabaseUrlSet: !!supabaseUrl,
          serviceKeySet: !!supabaseServiceKey,
          dbPasswordSet: !!dbPassword,
          dbUrlSet: !!dbUrl
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
