
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  
  // Simple status endpoint to confirm function is running
  const url = new URL(req.url);
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
    // Test response to check if function is accessible
    if (url.pathname.endsWith('/test')) {
      console.log("Returning test response");
      return new Response(
        JSON.stringify({ ok: true, message: "Fortnox proxy is working" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Parsed request data successfully", {
        method: requestData.method,
        endpoint: requestData.endpoint,
        hasBody: !!requestData.body
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
    if (!requestData.endpoint || !requestData.method) {
      const missingFields = [];
      if (!requestData.endpoint) missingFields.push('endpoint');
      if (!requestData.method) missingFields.push('method');
      
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

    // Get the Fortnox credentials from the request or from environment variables
    const accessToken = requestData.headers?.Authorization?.replace('Bearer ', '') || 
      Deno.env.get('FORTNOX_ACCESS_TOKEN');
    
    const clientSecret = requestData.headers?.['Client-Secret'] || 
      Deno.env.get('FORTNOX_CLIENT_SECRET');
    
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
    
    // Construct the full URL
    const fortnoxUrl = `${FORTNOX_API_BASE}${requestData.endpoint}`;
    console.log(`Making ${requestData.method} request to Fortnox: ${fortnoxUrl}`);
    
    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Client-Secret': clientSecret,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...requestData.headers
    };
    
    // Remove duplicate auth headers if they were included in the custom headers
    delete headers['Authorization'];
    delete headers['Client-Secret'];
    
    // Log the request (with sensitive data masked)
    console.log("Fortnox request details:", {
      url: fortnoxUrl,
      method: requestData.method,
      headers: {
        ...headers,
        'Authorization': headers['Authorization'] ? 'Bearer ***masked***' : undefined,
        'Client-Secret': headers['Client-Secret'] ? '***masked***' : undefined,
      },
      body: requestData.body ? '***present but not logged***' : null,
    });
    
    try {
      // Make the request to Fortnox
      const fortnoxResponse = await fetch(fortnoxUrl, {
        method: requestData.method,
        headers,
        body: requestData.body ? JSON.stringify(requestData.body) : undefined,
      });
      
      console.log(`Fortnox API response status: ${fortnoxResponse.status}`);
      
      // Get the response body as text first to handle both JSON and non-JSON responses
      const responseText = await fortnoxResponse.text();
      console.log(`Fortnox API raw response (first 500 chars): ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
      
      // Try to parse as JSON, but handle non-JSON responses gracefully
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log("Successfully parsed Fortnox response as JSON");
      } catch (e) {
        console.log("Response is not valid JSON, returning as text");
        // If it's not JSON, just return the raw text with appropriate status
        return new Response(responseText, {
          status: fortnoxResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': fortnoxResponse.headers.get('Content-Type') || 'text/plain'
          }
        });
      }
      
      // If Fortnox returned an error status, log it and return it with same status
      if (!fortnoxResponse.ok) {
        console.error("❌ Fortnox API returned error status:", fortnoxResponse.status);
        console.error("❌ Fortnox error details:", responseData);
        
        return new Response(
          JSON.stringify({ 
            error: "Fortnox API error", 
            status: fortnoxResponse.status,
            details: responseData 
          }),
          { 
            status: fortnoxResponse.status, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // Return successful response
      return new Response(
        JSON.stringify(responseData),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } catch (fetchError) {
      console.error("❌ Fetch error while calling Fortnox API:", fetchError);
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to connect to Fortnox API", 
          message: fetchError.message || "Unknown fetch error",
          stack: fetchError.stack || "No stack trace" 
        }),
        { 
          status: 502, // Bad Gateway
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
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
