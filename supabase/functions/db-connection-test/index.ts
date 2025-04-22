
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // ONLY use DB_URL for database connection
    const dbUrl = Deno.env.get("DB_URL");

    console.log("Database connection attempt with:", {
      dbUrlExists: !!dbUrl,
      dbUrlPreview: dbUrl ? `${dbUrl.substring(0, 12)}...` : "missing"
    });

    if (!dbUrl) {
      return new Response(
        JSON.stringify({
          error: "Database URL missing",
          details: "DB_URL environment variable is not set"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt connection directly using DB_URL
    console.log("Attempting database connection test...");

    const pool = new Pool(dbUrl, 1);
    let client;

    try {
      client = await pool.connect();
      console.log("Successfully connected to database, executing test query");
      const result = await client.queryObject("SELECT current_timestamp as time, current_database() as database");

      console.log("Database connection test successful!");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Database connection successful",
          data: result.rows[0]
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (dbError) {
      console.error("Database connection error:", dbError);

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
