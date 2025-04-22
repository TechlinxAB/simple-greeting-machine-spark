
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const sessionId = crypto.randomUUID().slice(0, 8);
  console.log(`[${sessionId}] Starting database connection test`);

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ONLY use DB_URL for connection
    const dbUrl = Deno.env.get("DB_URL");

    if (!dbUrl) {
      console.error(`[${sessionId}] Missing DB_URL`);
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
          details: "The DB_URL environment variable is missing"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${sessionId}] DB_URL check:`, {
      dbUrlExists: !!dbUrl,
      dbUrlLength: dbUrl?.length || 0,
      dbUrlPrefix: dbUrl?.substring(0, 12) + "..." // Only log prefix for security
    });

    // Use the DB_URL directly without any manipulation
    console.log(`[${sessionId}] Creating connection pool and attempting to connect...`);

    const pool = new Pool(dbUrl, 1);
    let client = null;

    try {
      client = await pool.connect();
      console.log(`[${sessionId}] ✅ Successfully connected to database with DB_URL`);
      const result = await client.queryObject("SELECT current_timestamp as time, current_database() as database");

      client.release();
      await pool.end();

      return new Response(
        JSON.stringify({
          success: true,
          message: "Successfully connected to database",
          connectionDetails: {
            successful: true,
            data: result.rows[0]
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (dbError) {
      console.error(`[${sessionId}] ❌ Database connection error with DB_URL:`, dbError);

      // Sanitize the connection string to not expose password in logs
      const sanitizedConnectionString = dbUrl.replace(/:[^:@]*@/, ":****@");

      return new Response(
        JSON.stringify({
          error: "Database connection failed",
          message: dbError instanceof Error ? dbError.message : "Unknown database error",
          connectionDetails: {
            successful: false,
            sanitizedUrl: sanitizedConnectionString
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
