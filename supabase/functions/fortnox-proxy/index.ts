
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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("Request body received:", JSON.stringify({
        endpoint: requestData.endpoint,
        method: requestData.method,
        contentType: requestData.contentType,
        hasData: !!requestData.data,
        hasAccessToken: !!requestData.accessToken
      }));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError.message);
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Invalid request format",
            details: parseError.message
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }

    const { endpoint, method, data, contentType, accessToken } = requestData;

    // Validate required parameters
    if (!endpoint) {
      console.error("Missing endpoint parameter");
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Missing endpoint parameter",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }
    
    if (!accessToken) {
      console.error("Missing accessToken parameter");
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Missing accessToken parameter",
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
        console.log(`Request body for ${method} request:`, JSON.stringify(data, null, 2));
      } else {
        options.body = data;
      }
    }

    try {
      // Make the request to Fortnox API
      const response = await fetch(url, options);
      const responseText = await response.text();
      
      console.log(`Fortnox API response status: ${response.status}`);
      console.log(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
      console.log(`Response body (excerpt): ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e.message);
        console.log("Raw response:", responseText);
        return addCorsHeaders(
          new Response(
            JSON.stringify({
              error: "Invalid JSON response from Fortnox",
              rawResponse: responseText.substring(0, 1000),
              status: response.status
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      }
      
      // Handle API-level errors
      if (!response.ok) {
        let errorMessage = `Fortnox API error ${response.status}`;
        let errorDetails = responseData;
        
        if (responseData.ErrorInformation) {
          errorMessage = responseData.ErrorInformation.message || responseData.ErrorInformation.Message || errorMessage;
          errorDetails = responseData.ErrorInformation;
          console.error("Error details:", JSON.stringify(errorDetails));
        } else if (responseData.error) {
          errorMessage = responseData.error;
        }
        
        console.error(`Fortnox API error: ${errorMessage}`);
        
        // Check for article not found with code 2000428
        if (response.status === 404 && url.includes('articles/') && 
            (responseData.ErrorInformation?.Code === 2000428 || 
             responseData.ErrorInformation?.code === 2001302 ||
             (errorMessage && errorMessage.includes("hitta artikel")))) {
          // Extract the article number from the URL
          const match = url.match(/articles\/([^\/]+)/);
          const articleNumber = match ? match[1] : null;
          
          if (articleNumber) {
            return addCorsHeaders(
              new Response(
                JSON.stringify({
                  error: "article_not_found",
                  message: "Article not found in Fortnox",
                  status: response.status,
                  articleDetails: {
                    articleNumber,
                    description: "This article must be created in Fortnox"
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
        
        // Special handling for account-related errors
        if ((errorMessage && errorMessage.includes("momssatsen")) || 
            (errorMessage && errorMessage.includes("konto") && 
             (errorMessage.includes("existerar inte") || errorMessage.includes("inte hitta konto")))) {
          // This is an account related error
          // Extract the invalid account number if possible
          const accountMatch = errorMessage.match(/konto\s+["']?(\d+)["']?/i) || 
                              errorMessage.match(/[Aa]ccount\s+["']?(\d+)["']?/i);
          const accountNumber = accountMatch ? accountMatch[1] : null;
          
          return addCorsHeaders(
            new Response(
              JSON.stringify({
                error: "account_not_found",
                message: errorMessage,
                status: response.status,
                accountDetails: {
                  accountNumber: accountNumber,
                  suggestedAccount: "3001", // Default sales account
                  endpoint: endpoint,
                  method: method
                }
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }
        
        // General error response
        return addCorsHeaders(
          new Response(
            JSON.stringify({
              error: errorMessage,
              details: errorDetails,
              status: response.status,
              endpoint,
              method
            }),
            {
              status: response.status,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      }
      
      // Parse and return the successful response
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
    } catch (fetchError) {
      console.error("Error making request to Fortnox API:", fetchError);
      return addCorsHeaders(
        new Response(
          JSON.stringify({
            error: "Error connecting to Fortnox API",
            message: fetchError.message || "Unknown connection error",
            endpoint
          }),
          {
            status: 502, // Bad Gateway
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    }
  } catch (error) {
    console.error("Unhandled error in fortnox-proxy function:", error);
    
    return addCorsHeaders(
      new Response(
        JSON.stringify({
          error: "Server error",
          message: error.message || "Unknown error occurred",
          stack: error.stack || "No stack trace available"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
  }
});
