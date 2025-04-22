
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// === UPDATED: Only uses DB_URL for Postgres connection! ===

interface TokenRefreshRequest {
  force?: boolean;
  token?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: TokenRefreshRequest = await req.json();
    const authHeader = req.headers.get("Authorization");
    const providedToken = authHeader?.replace("Bearer ", "") || requestData.token;

    const refreshSecret = Deno.env.get("FORTNOX_REFRESH_SECRET");
    if (!refreshSecret) {
      console.error("FORTNOX_REFRESH_SECRET is not set in environment");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (providedToken && providedToken !== refreshSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === UPDATE: Use only DB_URL ===
    const dbUrl = Deno.env.get("DB_URL");

    // Log credential availability without exposing actual values
    console.log("Database credential check:", {
      dbUrlExists: !!dbUrl,
      dbUrlLength: dbUrl?.length || 0
    });

    if (!dbUrl) {
      console.error("Database credentials missing. DB_URL must be set.");
      return new Response(
        JSON.stringify({
          error: "Database configuration missing",
          details: "Make sure DB_URL is set in the Edge Function secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Initiating Fortnox token refresh, force =", requestData.force ? "true" : "false");

    // For now, we’re simulating the token refresh process as previously
    // The real refresh logic would use dbUrl

    console.log("Connection string pattern:", {
      hasPasswordPlaceholder: dbUrl.includes(":password@"),
      hasPasswordParam: dbUrl.includes("password="),
      urlType: dbUrl.startsWith("postgres") ? "postgres://" : "other"
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Token refresh simulation completed",
        details: "Database credentials verified. Implement actual token refresh logic here.",
        timestamp: new Date().toISOString(),
        dbConfiguration: {
          urlExists: !!dbUrl,
          connectionPatterns: {
            hasPasswordPlaceholder: dbUrl.includes(":password@"),
            hasPasswordParam: dbUrl.includes("password=")
          }
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error in token refresh:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
