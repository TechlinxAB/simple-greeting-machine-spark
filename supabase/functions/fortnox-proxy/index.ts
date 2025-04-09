
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// API base URL for Fortnox
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Log all requests immediately for debugging
  console.log("===== FORTNOX PROXY REQUEST =====");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  // Handle CORS preflight requests - must be at top level
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Parse the request URL
  const url = new URL(req.url);
  
  // Simple status endpoint to confirm function is running
  if (url.pathname.endsWith('/status') || url.pathname.endsWith('/test')) {
    console.log("Returning status test response");
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Fortnox proxy is working", 
        timestamp: new Date().toISOString(),
        path: url.pathname
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
  
  try {
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed request data:", {
        method: requestData.method,
        path: requestData.path || requestData.endpoint,
        hasBody: !!requestData.body || !!requestData.payload,
        hasHeaders: !!requestData.headers,
        authHeaderPresent: requestData.headers?.Authorization ? "yes" : "no",
        clientSecretPresent: requestData.headers?.['Client-Secret'] ? "yes" : "no"
      });
      
      // Log the complete request payload for debugging
      if (requestData.payload || requestData.body) {
        console.log("Detailed request payload:", JSON.stringify(requestData.payload || requestData.body, null, 2));
      }
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
    
    // Get path and method from request data
    const method = requestData.method;
    const path = requestData.path || requestData.endpoint;
    const payload = requestData.payload || requestData.body;
    
    // Validate required fields
    if (!path || !method) {
      const missingFields = [];
      if (!path) missingFields.push('path (or endpoint)');
      if (!method) missingFields.push('method');
      
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

    // Get the Fortnox credentials from the request.headers object
    const accessToken = requestData.headers?.Authorization?.replace('Bearer ', '') || 
      requestData.headers?.['Access-Token'];
    
    const clientSecret = requestData.headers?.['Client-Secret'];
    
    if (!accessToken || !clientSecret) {
      const missingAuth = [];
      if (!accessToken) missingAuth.push('accessToken');
      if (!clientSecret) missingAuth.push('clientSecret');
      
      console.error(`Missing authentication data: ${missingAuth.join(', ')}`);
      
      return new Response(
        JSON.stringify({ 
          error: "Missing authentication data",
          details: {
            missing: missingAuth
          }
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Construct the full URL - ensure path starts with a slash
    const fortnoxPath = path.startsWith('/') ? path : `/${path}`;
    const fortnoxUrl = `${FORTNOX_API_BASE}${fortnoxPath}`;
    
    console.log(`Making ${method} request to Fortnox: ${fortnoxUrl}`);
    console.log(`Using headers: Authorization=Bearer ${accessToken.substring(0, 5)}..., Client-Secret=${clientSecret.substring(0, 5)}...`);
    
    // Log the complete payload for debugging
    if (method !== 'GET' && payload) {
      console.log("Request payload to Fortnox:", JSON.stringify(payload, null, 2));
    }
    
    // IMPROVED ERROR HANDLING AND RESPONSE FORWARDING
    try {
      const fortnoxRes = await fetch(fortnoxUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Secret': clientSecret,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(method !== 'GET' ? {} : { 'Cache-Control': 'no-cache' }),
        },
        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
      });
      
      const text = await fortnoxRes.text();
      
      // If response is not successful, log the complete error message
      if (!fortnoxRes.ok) {
        console.error(`❌ Fortnox API Error (${fortnoxRes.status}): ${text}`);
        
        // Try to parse the error response
        let errorDetails;
        try {
          errorDetails = JSON.parse(text);
        } catch (e) {
          errorDetails = { rawText: text };
        }
        
        // Enhanced error logging for specific error codes
        if (fortnoxRes.status === 400) {
          console.error("💥 Fortnox Bad Request (400) details:", JSON.stringify(errorDetails, null, 2));
          console.error("💥 Request payload that caused the error:", JSON.stringify(payload, null, 2));
        }
        
        return new Response(
          JSON.stringify({
            error: `Fortnox API Error: HTTP ${fortnoxRes.status}`,
            details: errorDetails,
            fortnoxStatus: fortnoxRes.status,
            requestPayload: payload // Include the original payload that caused the error
          }),
          {
            status: fortnoxRes.status,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
      
      console.log("✅ Fortnox request completed", {
        url: fortnoxUrl,
        status: fortnoxRes.status,
        headersSent: {
          'Authorization': 'Bearer ***masked***',
          'Client-Secret': '***masked***',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        response: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
      });
      
      // Forward the exact response from Fortnox, including status code
      return new Response(text, {
        status: fortnoxRes.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    } catch (error) {
      console.error("❌ Fortnox proxy fetch failed:", error.message);
      return new Response(JSON.stringify({ 
        error: "Failed to connect to Fortnox API",
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        },
      });
    }
  } catch (error) {
    console.error("❌ Server error in fortnox-proxy:", error);
    return new Response(
      JSON.stringify({ 
        error: "Server error", 
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
