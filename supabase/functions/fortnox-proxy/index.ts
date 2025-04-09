
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// API base URL for Fortnox
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  console.log("Received Fortnox proxy request");
  console.log("Request method:", req.method);
  console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  try {
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
    const url = `${FORTNOX_API_BASE}${requestData.endpoint}`;
    console.log(`Making ${requestData.method} request to Fortnox: ${url}`);
    
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
      url,
      method: requestData.method,
      headers: {
        ...headers,
        'Authorization': headers['Authorization'] ? 'Bearer ***masked***' : undefined,
        'Client-Secret': headers['Client-Secret'] ? '***masked***' : undefined,
      },
      body: requestData.body ? '***present but not logged***' : null,
    });
    
    // Make the request to Fortnox
    const response = await fetch(url, {
      method: requestData.method,
      headers,
      body: requestData.body ? JSON.stringify(requestData.body) : undefined,
    });
    
    console.log(`Fortnox API response status: ${response.status}`);
    
    // Get the response body
    const responseText = await response.text();
    
    // Log the response (but don't log large responses fully)
    if (responseText.length > 500) {
      console.log(`Fortnox API response (truncated): ${responseText.substring(0, 500)}...`);
    } else {
      console.log(`Fortnox API response: ${responseText}`);
    }
    
    let responseData;
    
    try {
      // Try to parse as JSON
      responseData = JSON.parse(responseText);
      console.log("Successfully parsed Fortnox response as JSON");
    } catch (e) {
      console.error("Response is not valid JSON:", responseText.substring(0, 200));
      // Return the raw text if it's not JSON
      return new Response(responseText, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': response.headers.get('Content-Type') || 'text/plain'
        }
      });
    }
    
    // Return the response
    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Server error in fortnox-proxy:", error);
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
