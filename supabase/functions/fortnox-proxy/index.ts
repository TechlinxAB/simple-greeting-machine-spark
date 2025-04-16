
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
  try {
    console.log("Received request to fortnox-proxy function", req.url);
    
    // Handle CORS preflight requests
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    // Parse URL to get Fortnox endpoint from the request path
    const url = new URL(req.url);
    console.log("Full request URL:", url.toString());
    
    // The path should contain /fortnox-proxy/{fortnox-endpoint}
    const pathParts = url.pathname.split('/');
    
    // Find the index of 'fortnox-proxy' in the path
    const proxyIndex = pathParts.findIndex(part => part === 'fortnox-proxy');
    
    if (proxyIndex === -1) {
      console.error("Invalid URL path, 'fortnox-proxy' not found:", url.pathname);
      return new Response(
        JSON.stringify({ error: "Invalid URL path" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    // Get the Fortnox endpoint by taking everything after 'fortnox-proxy'
    const fortnoxEndpointParts = pathParts.slice(proxyIndex + 1);
    const fortnoxEndpoint = '/' + fortnoxEndpointParts.join('/');
    
    console.log(`Fortnox endpoint: ${fortnoxEndpoint}`);
    
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
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    console.log("Fetching Fortnox credentials from system_settings");
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
    
    if (!credentialsResponse.ok) {
      console.error("Failed to fetch Fortnox credentials:", await credentialsResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch Fortnox credentials" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    const credentialsData = await credentialsResponse.json();
    
    if (!credentialsData || !credentialsData[0] || !credentialsData[0].settings || !credentialsData[0].settings.accessToken) {
      console.error("Invalid Fortnox credentials format:", credentialsData);
      return new Response(
        JSON.stringify({ error: "Fortnox API credentials not found or invalid" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
    
    const { accessToken, clientSecret } = credentialsData[0].settings;
    
    // Configure Fortnox API request
    const FORTNOX_API_URL = "https://api.fortnox.se/3";
    
    // Create the URL for Fortnox API with appropriate query parameters
    const fortnoxUrl = new URL(`${FORTNOX_API_URL}${fortnoxEndpoint}`);
    
    // Copy query parameters from original request
    url.searchParams.forEach((value, key) => {
      fortnoxUrl.searchParams.append(key, value);
    });
    
    console.log(`Proxying ${req.method} request to Fortnox: ${fortnoxUrl.toString()}`);
    
    // Extract request body for POST/PUT methods
    let requestBody = null;
    if (req.method !== "GET" && req.method !== "OPTIONS") {
      const contentType = req.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        requestBody = await req.json();
        console.log("Request body:", JSON.stringify(requestBody, null, 2));
      } else {
        requestBody = await req.text();
      }
    }
    
    // Forward the request to Fortnox API
    const fortnoxHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Accept": "application/json",
      "Access-Token": accessToken,
      "Client-Secret": clientSecret,
    };
    
    console.log("Fortnox request headers:", JSON.stringify({
      "Content-Type": fortnoxHeaders["Content-Type"],
      "Accept": fortnoxHeaders["Accept"],
      "Access-Token": "********", // Masked for security
      "Client-Secret": "********", // Masked for security
    }, null, 2));
    
    const fortnoxResponse = await fetch(fortnoxUrl.toString(), {
      method: req.method,
      headers: fortnoxHeaders,
      body: requestBody ? (typeof requestBody === "string" ? requestBody : JSON.stringify(requestBody)) : undefined,
    });
    
    console.log(`Fortnox response status: ${fortnoxResponse.status}`);
    
    // For article not found errors, prepare helpful error response
    if (fortnoxResponse.status === 400) {
      const errorText = await fortnoxResponse.text();
      console.log("Fortnox error response:", errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        
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
      } catch (parseError) {
        console.error("Error parsing Fortnox error response:", parseError);
        // If we can't parse the error, return it as-is
        return new Response(errorText, {
          status: fortnoxResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain",
          },
        });
      }
    }
    
    // Handle successful response
    let responseData;
    const contentType = fortnoxResponse.headers.get("Content-Type") || "";
    
    if (contentType.includes("application/json")) {
      const jsonText = await fortnoxResponse.text();
      console.log("Fortnox JSON response:", jsonText);
      try {
        responseData = JSON.parse(jsonText);
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        responseData = jsonText;
      }
    } else {
      responseData = await fortnoxResponse.text();
      console.log("Fortnox text response:", responseData);
    }
    
    return new Response(
      typeof responseData === "string" ? responseData : JSON.stringify(responseData),
      {
        status: fortnoxResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType || "application/json",
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
