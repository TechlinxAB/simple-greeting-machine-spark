
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
  // Generate a unique session ID for tracing
  const sessionId = crypto.randomUUID().slice(0, 8);
  console.log(`[${sessionId}] Database connection test function called`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const refreshSecret = Deno.env.get("FORTNOX_REFRESH_SECRET");

    if (!refreshSecret) {
      console.error(`[${sessionId}] FORTNOX_REFRESH_SECRET is not set in environment`);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "") !== refreshSecret) {
      console.error(`[${sessionId}] Invalid or missing authorization token`);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get DB_URL for database connection
    const dbUrl = Deno.env.get("DB_URL");

    console.log(`[${sessionId}] Database connection attempt with:`, {
      dbUrlExists: !!dbUrl,
      dbUrlPreview: dbUrl ? `${dbUrl.substring(0, 12)}...` : "missing"
    });

    if (!dbUrl) {
      console.error(`[${sessionId}] Database URL missing`);
      return new Response(
        JSON.stringify({
          error: "Database URL missing",
          details: "DB_URL environment variable is not set"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt connection directly using DB_URL
    console.log(`[${sessionId}] Attempting database connection test...`);

    const pool = new Pool(dbUrl, 1);
    let client;

    try {
      client = await pool.connect();
      console.log(`[${sessionId}] Successfully connected to database, executing test query`);
      const result = await client.queryObject("SELECT current_timestamp as time, current_database() as database");

      console.log(`[${sessionId}] Database connection test successful!`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Database connection successful",
          data: result.rows[0]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (dbError) {
      console.error(`[${sessionId}] Database connection error:`, dbError);

      const sanitizedConnectionString = dbUrl.replace(/:[^:@]*@/, ":****@");

      return new Response(
        JSON.stringify({
          error: "Database connection failed",
          message: dbError instanceof Error ? dbError.message : "Unknown database error",
          connectionDetails: {
            sanitizedUrl: sanitizedConnectionString
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } finally {
      if (client) {
        client.release();
      }
      await pool.end();
    }

  } catch (error) {
    console.error(`[${sessionId}] Error in database connection test:`, error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
