
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    const refreshSecret = Deno.env.get("FORTNOX_REFRESH_SECRET");
    
    if (!refreshSecret) {
      console.error("FORTNOX_REFRESH_SECRET is not set in environment");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== refreshSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get database connection details from environment using correct variable names
    const dbUrl = Deno.env.get("SUPABASE_DB_URL"); // Match exact name from screenshot
    const dbPassword = Deno.env.get("DB_PASSWORD"); // Match exact name from screenshot
    
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ 
          error: "Database URL missing",
          details: "SUPABASE_DB_URL environment variable is not set"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!dbPassword) {
      return new Response(
        JSON.stringify({ 
          error: "Database password missing",
          details: "DB_PASSWORD environment variable is not set"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Replace password placeholder with actual password
    const connectionString = dbUrl.replace(/:password@/, `:${dbPassword}@`);
    
    console.log("Attempting database connection test...");
    
    // Create a database connection pool
    const pool = new Pool(connectionString, 1);
    let client;
    
    try {
      // Get a connection from the pool
      client = await pool.connect();
      
      // Test query
      const result = await client.queryObject("SELECT current_timestamp as time, current_database() as database");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Database connection successful",
          data: result.rows[0],
          connectionDetails: {
            url: dbUrl.replace(/:[^:]*@/, ":****@"), // Mask password in URL
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      
      return new Response(
        JSON.stringify({ 
          error: "Database connection failed", 
          message: dbError instanceof Error ? dbError.message : "Unknown database error",
          connectionDetails: {
            url: dbUrl.replace(/:[^:]*@/, ":****@"), // Mask password in URL
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } finally {
      // Release the client back to the pool
      if (client) {
        client.release();
      }
      // Close the pool
      await pool.end();
    }
    
  } catch (error) {
    console.error("Error in database connection test:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
