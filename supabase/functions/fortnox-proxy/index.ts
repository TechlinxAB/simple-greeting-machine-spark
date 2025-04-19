
import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// Main handler for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { endpoint, method, data, contentType, accessToken } = await req.json();

    // Validate required parameters
    if (!endpoint || !accessToken) {
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Missing required parameters",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Format the request URL
    let url = `https://api.fortnox.se/3/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;

    // Replace double slashes in the URL path (except after the protocol)
    url = url.replace(/([^:]\/)\/+/g, "$1");

    console.log(`Making ${method} request to Fortnox API: ${url}`);

    // Prepare headers
    const headers = new Headers({
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': contentType || 'application/json',
      'Accept': 'application/json'
    });

    // Prepare request options
    const options: RequestInit = {
      method: method || 'GET',
      headers,
    };

    // Add request body for non-GET requests
    if (method !== 'GET' && data) {
      if (contentType === 'application/json' && typeof data !== 'string') {
        options.body = JSON.stringify(data);
      } else {
        options.body = data;
      }
    }

    // Make the request to Fortnox API
    const response = await fetch(url, options);
    
    // Handle API-level errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Fortnox API error ${response.status}`;
      let errorDetails = errorText;
      
      try {
        // Try to parse error response
        const errorJson = JSON.parse(errorText);
        
        if (errorJson.ErrorInformation) {
          errorMessage = errorJson.ErrorInformation.message || errorMessage;
          errorDetails = JSON.stringify(errorJson.ErrorInformation);
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
          errorDetails = JSON.stringify(errorJson);
        }
      } catch (e) {
        // If parsing fails, use the raw error text
      }
      
      // Special handling for common errors
      if (response.status === 401) {
        errorMessage = "Fortnox authentication expired";
      } else if (response.status === 404) {
        // Check for specific article not found error
        if (errorText.includes("article") && errorText.includes("not found")) {
          // Extract the article number from the URL if possible
          const match = url.match(/articles\/([^\/]+)/);
          const articleNumber = match ? match[1] : null;
          
          return addCorsHeaders(
            new Response(
              JSON.stringify({
                error: "article_not_found",
                message: "Article not found in Fortnox",
                status: response.status,
                articleDetails: {
                  articleNumber,
                  // Include additional details that might be useful for creating the article
                  description: "Auto-created by Techlinx app",
                  accountNumber: "3001", // Default account
                  vat: 25 // Default VAT
                }
              }),
              {
                status: 404,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }
      }
      
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: errorMessage,
            details: errorDetails,
            status: response.status
          }),
          {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    // Parse and return the successful response
    const responseData = await response.json();
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          data: responseData,
          success: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  } catch (error) {
    console.error("Error in fortnox-proxy function:", error);
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          error: error.message || "Unknown error occurred",
          success: false
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
});
