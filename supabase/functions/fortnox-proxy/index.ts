
// Supabase Edge Function for Fortnox API proxy
// This function proxies requests to Fortnox API with proper authentication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers to allow web app to communicate with this function
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Handle CORS preflight requests
function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Parse URL to get Fortnox endpoint from the request path
    const url = new URL(req.url);
    let fortnoxEndpoint = url.pathname.replace("/fortnox-proxy", "");
    
    // Get auth header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Extract Supabase JWT token from authHeader
    const token = authHeader.replace("Bearer ", "");
    
    // Get Fortnox API credentials from our system settings table
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
    
    const credentialsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/system_settings?id=eq.fortnox_credentials&select=settings`,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );
    
    const credentialsData = await credentialsResponse.json();
    
    if (!credentialsData || !credentialsData[0] || !credentialsData[0].settings || !credentialsData[0].settings.accessToken) {
      console.error("Failed to retrieve Fortnox credentials");
      return new Response(
        JSON.stringify({ error: "Fortnox API credentials not found" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    const { accessToken } = credentialsData[0].settings;
    
    // Configure Fortnox API request
    const FORTNOX_API_URL = "https://api.fortnox.se/3";
    
    // Create the URL for Fortnox API with appropriate query parameters
    const fortnoxUrl = new URL(`${FORTNOX_API_URL}${fortnoxEndpoint}`);
    
    // Copy query parameters from original request
    url.searchParams.forEach((value, key) => {
      fortnoxUrl.searchParams.append(key, value);
    });
    
    // Extract request body for POST/PUT methods
    let requestBody = null;
    if (req.method !== "GET" && req.method !== "OPTIONS") {
      const contentType = req.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        requestBody = await req.json();
      } else {
        requestBody = await req.text();
      }
    }
    
    // Log the request information for debugging
    console.log(`Proxying ${req.method} request to Fortnox: ${fortnoxUrl.toString()}`);
    if (requestBody) {
      console.log("Request body:", JSON.stringify(requestBody));
    }
    
    // Forward the request to Fortnox API
    const fortnoxResponse = await fetch(fortnoxUrl.toString(), {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Access-Token": accessToken,
        "Client-Secret": credentialsData[0].settings.clientSecret,
      },
      body: requestBody ? (typeof requestBody === "string" ? requestBody : JSON.stringify(requestBody)) : undefined,
    });
    
    // For article not found errors, prepare helpful error response
    if (fortnoxResponse.status === 400) {
      const errorData = await fortnoxResponse.json();
      
      // Check if this is an article not found error
      if (
        errorData?.ErrorInformation?.error &&
        errorData.ErrorInformation.error === 2000422 &&
        requestBody?.Invoice?.InvoiceRows
      ) {
        console.log("Article not found error detected, providing helpful error");
        
        // Find the article info to help auto-creation
        const errorMessage = errorData.ErrorInformation.message || "";
        const articleNumberMatch = errorMessage.match(/ArticleNumber:([^,]+)/);
        const articleNumber = articleNumberMatch ? articleNumberMatch[1].trim() : null;
        
        if (articleNumber) {
          // Find the corresponding row in the invoice data
          const row = requestBody.Invoice.InvoiceRows.find(
            (row: any) => row.ArticleNumber === articleNumber
          );
          
          if (row) {
            return new Response(
              JSON.stringify({
                error: "article_not_found",
                message: "Article not found in Fortnox",
                articleDetails: {
                  articleNumber: articleNumber,
                  description: row.Description,
                  accountNumber: row.AccountNumber,
                  vat: row.VAT,
                },
              }),
              {
                status: 404,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                },
              }
            );
          }
        }
      }
      
      // Return the original error if not handled specifically
      return new Response(JSON.stringify(errorData), {
        status: fortnoxResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    
    // Handle successful response
    let responseData;
    const contentType = fortnoxResponse.headers.get("Content-Type") || "";
    
    if (contentType.includes("application/json")) {
      responseData = await fortnoxResponse.json();
    } else {
      responseData = await fortnoxResponse.text();
    }
    
    return new Response(
      typeof responseData === "string" ? responseData : JSON.stringify(responseData),
      {
        status: fortnoxResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
        },
      }
    );
    
  } catch (error) {
    console.error("Edge function error:", error);
    
    return new Response(
      JSON.stringify({
        error: "Edge Function error",
        message: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
