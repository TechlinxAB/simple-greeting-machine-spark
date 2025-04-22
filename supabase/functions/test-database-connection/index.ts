
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Generate a session ID for tracking this request in logs
  const sessionId = crypto.randomUUID().slice(0, 8);
  console.log(`[${sessionId}] Starting database connection test`);
  
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get all environment variables for database connection
    const envVars = {
      dbUrl: Deno.env.get("SUPABASE_DB_URL"),
      dbPassword: Deno.env.get("DB_PASSWORD"),
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      anonKey: Deno.env.get("SUPABASE_ANON_KEY"),
      serviceRole: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    };
    
    // Check if all required variables exist
    const missingVars = Object.entries(envVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);
    
    if (missingVars.length > 0) {
      console.error(`[${sessionId}] Missing environment variables:`, missingVars);
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
          details: `The following environment variables are missing: ${missingVars.join(", ")}`
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Log what we have (without exposing actual values)
    console.log(`[${sessionId}] Environment variables check:`, {
      dbUrlExists: !!envVars.dbUrl,
      dbPasswordExists: !!envVars.dbPassword,
      dbUrlLength: envVars.dbUrl?.length || 0,
      dbUrlFormat: envVars.dbUrl?.substring(0, 10) + "..."
    });
    
    // Check for password pattern in the connection string
    const patterns = {
      hasPasswordPlaceholder: envVars.dbUrl?.includes(":password@") || false,
      hasPasswordParam: envVars.dbUrl?.includes("password=") || false,
      hasDoubleColon: envVars.dbUrl?.includes("::") || false
    };
    
    console.log(`[${sessionId}] Connection string patterns:`, patterns);
    
    // Build the connection string based on detected pattern
    let connectionString = envVars.dbUrl as string;
    
    if (patterns.hasPasswordPlaceholder) {
      connectionString = connectionString.replace(/:password@/, `:${envVars.dbPassword}@`);
      console.log(`[${sessionId}] Using :password@ replacement pattern`);
    } else if (connectionString.includes("password=password")) {
      connectionString = connectionString.replace(/password=password/, `password=${envVars.dbPassword}`);
      console.log(`[${sessionId}] Using password=password replacement pattern`);
    } else if (patterns.hasPasswordParam) {
      connectionString = connectionString.replace(/password=([^&]*)/, `password=${envVars.dbPassword}`);
      console.log(`[${sessionId}] Using password= generic replacement pattern`);
    } else {
      console.log(`[${sessionId}] No standard password pattern found, attempting connection with original string`);
    }
    
    // Create a database connection pool and attempt to connect
    console.log(`[${sessionId}] Creating connection pool and attempting to connect...`);
    
    // Try different variations of the connection string if the initial one fails
    const connectionAttempts = [
      {
        name: "Original connection string",
        connectionString: connectionString
      },
      {
        name: "Modified connection with simple replacement",
        connectionString: envVars.dbUrl?.replace(/:password@/, `:${envVars.dbPassword}@`)
      },
      {
        name: "Modified connection with generic parameter replacement",
        connectionString: envVars.dbUrl?.replace(/password=([^&]*)/, `password=${envVars.dbPassword}`)
      }
    ];
    
    // Try each connection variation
    let successful = false;
    let successResult = null;
    let lastError = null;
    
    for (const attempt of connectionAttempts) {
      if (!attempt.connectionString) continue;
      
      console.log(`[${sessionId}] Trying connection variation: ${attempt.name}`);
      
      const pool = new Pool(attempt.connectionString, 1);
      let client = null;
      
      try {
        client = await pool.connect();
        console.log(`[${sessionId}] ✅ Successfully connected to database with: ${attempt.name}`);
        
        // Run a test query
        const result = await client.queryObject("SELECT current_timestamp as time, current_database() as database");
        
        successful = true;
        successResult = {
          attemptName: attempt.name,
          data: result.rows[0]
        };
        
        // Close connection properly
        client.release();
        await pool.end();
        break;
        
      } catch (dbError) {
        console.error(`[${sessionId}] ❌ Database connection error with ${attempt.name}:`, dbError);
        lastError = dbError;
        
        // Make sure to clean up
        if (client) client.release();
        try {
          await pool.end();
        } catch (endError) {
          console.error(`[${sessionId}] Error closing pool:`, endError);
        }
      }
    }
    
    if (successful) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Successfully connected to database",
          connectionDetails: {
            successful: true,
            attemptName: successResult?.attemptName,
            data: successResult?.data,
            patterns: patterns
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: "All database connection attempts failed",
          message: lastError instanceof Error ? lastError.message : "Unknown database error",
          connectionDetails: {
            successful: false,
            attemptsMade: connectionAttempts.length,
            patterns: patterns
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    console.error(`[${sessionId}] Unhandled error in test function:`, error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
