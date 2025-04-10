
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// API base URL for Fortnox
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Valid account ranges for Fortnox in Sweden
const VALID_ACCOUNTS = {
  // Revenue accounts
  revenue: {
    min: 3000,
    max: 3999,
    default: "3001" // Default revenue account
  }
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
    
    // Process payload for special cases
    if (method !== 'GET' && payload) {
      console.log("Request payload to Fortnox:", JSON.stringify(payload, null, 2));
      
      // IMPORTANT: Preserve the original ArticleNumber when creating articles
      if (method === 'POST' && path.includes('/articles') && payload.Article) {
        console.log("🔍 Processing article creation with ArticleNumber:", payload.Article.ArticleNumber);
        
        // Make sure we don't remove or modify the ArticleNumber that was passed in
        if (payload.Article.ArticleNumber) {
          console.log("✅ Using provided ArticleNumber for article creation:", payload.Article.ArticleNumber);
        }
        
        // IMPORTANT: Remove SalesPrice from Article creation as it's read-only
        if (payload.Article.SalesPrice !== undefined) {
          console.log("⚠️ Removing SalesPrice from Article payload - it's read-only in Fortnox");
          delete payload.Article.SalesPrice;
        }
      }
      
      // VALIDATION: For Invoice Creation
      if (method === 'POST' && path.includes('/invoices') && payload.Invoice) {
        console.log("🔍 Validating invoice payload...");
        
        // Remove EmailInformation completely
        if (payload.Invoice.EmailInformation) {
          console.log("⚠️ Removing EmailInformation from Invoice payload - not needed for creation");
          delete payload.Invoice.EmailInformation;
        }
        
        // Remove Comments if present
        if (payload.Invoice.Comments) {
          console.log("⚠️ Removing Comments from Invoice payload - not needed");
          delete payload.Invoice.Comments;
        }
        
        // Ensure correct format for Invoice
        if (payload.Invoice) {
          // Make sure PricesIncludeVAT is correctly formatted as VATIncluded
          if (payload.Invoice.hasOwnProperty('PricesIncludeVAT')) {
            payload.Invoice.VATIncluded = payload.Invoice.PricesIncludeVAT; 
            delete payload.Invoice.PricesIncludeVAT;
            console.log("⚠️ Replaced PricesIncludeVAT with VATIncluded as per Fortnox API");
          }
          
          // Validate InvoiceRows and ensure account numbers are valid
          if (payload.Invoice.InvoiceRows && Array.isArray(payload.Invoice.InvoiceRows)) {
            payload.Invoice.InvoiceRows = payload.Invoice.InvoiceRows.map((row) => {
              // Create a new sanitized row
              const validRow = {
                Description: row.Description,
                DeliveredQuantity: row.DeliveredQuantity,
                Price: row.Price,
                VAT: [25, 12, 6].includes(row.VAT) ? row.VAT : 25,
              };
              
              // Ensure AccountNumber is valid - use the default revenue account if not
              // This fixes the "Kunde inte hitta konto 3050" error
              const accountNum = parseInt(row.AccountNumber || "0");
              if (isNaN(accountNum) || accountNum < VALID_ACCOUNTS.revenue.min || accountNum > VALID_ACCOUNTS.revenue.max) {
                console.log(`⚠️ Invalid account number ${row.AccountNumber}, using default: ${VALID_ACCOUNTS.revenue.default}`);
                validRow.AccountNumber = VALID_ACCOUNTS.revenue.default;
              } else {
                validRow.AccountNumber = row.AccountNumber;
              }
              
              // Add Unit if provided
              if (row.Unit) {
                validRow.Unit = row.Unit;
              }
              
              // Preserve ArticleNumber if provided
              if (row.ArticleNumber) {
                validRow.ArticleNumber = row.ArticleNumber;
                console.log(`✅ Preserving ArticleNumber in invoice row: ${row.ArticleNumber}`);
              }
              
              return validRow;
            });
            
            // Additional sanitization - make sure descriptions don't have problematic characters
            for (const row of payload.Invoice.InvoiceRows) {
              if (row.Description) {
                // Remove pipe symbols and other potentially problematic characters
                row.Description = row.Description.replace(/\|/g, '-');
                row.Description = row.Description.replace(/[^\w\s\-,.()]/g, '');
                row.Description = row.Description.trim();
              }
            }
          }
        }
      }
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
        
        // Extract error code for better diagnosis
        let errorCode = null;
        let errorMessage = "Unknown error";
        
        if (errorDetails?.ErrorInformation?.Code) {
          errorCode = errorDetails.ErrorInformation.Code;
        } else if (errorDetails?.ErrorInformation?.code) {
          errorCode = errorDetails.ErrorInformation.code;
        }
        
        if (errorDetails?.ErrorInformation?.message) {
          errorMessage = errorDetails.ErrorInformation.message;
        } else if (errorDetails?.ErrorInformation?.Message) {
          errorMessage = errorDetails.ErrorInformation.Message;
        }
        
        // Detailed detection of article not found errors for auto-creation feature
        if (method === 'POST' && path.includes('/invoices') && payload && payload.Invoice) {
          // Get both specific error codes and check message content
          if (
            errorCode === 2001302 || // Specific code for article not found
            (errorMessage && (
              errorMessage.includes("Kunde inte hitta artikel") ||
              errorMessage.includes("Article not found")
            ))
          ) {
            console.log("📝 Detected article not found error, extracting article details for auto-creation");
            
            // Extract the article number from the error message
            const articleNumberRegex = /\((\d+)\)/;
            const articleNumberMatch = errorMessage.match(articleNumberRegex);
            const missingArticleNumber = articleNumberMatch ? articleNumberMatch[1] : null;
            
            if (missingArticleNumber) {
              console.log(`📝 Extracted missing article number: ${missingArticleNumber}`);
              
              // Find the invoice row with this article number
              const problematicRow = payload.Invoice.InvoiceRows.find(
                row => row.ArticleNumber === missingArticleNumber
              );
              
              if (problematicRow) {
                console.log(`📝 Found invoice row for missing article: ${JSON.stringify(problematicRow, null, 2)}`);
                
                // Return the article details for auto-creation
                return new Response(
                  JSON.stringify({
                    error: "article_not_found",
                    message: `Article number ${missingArticleNumber} not found in Fortnox`,
                    articleDetails: {
                      articleNumber: missingArticleNumber,
                      description: problematicRow.Description,
                      price: problematicRow.Price,
                      vat: problematicRow.VAT,
                      accountNumber: problematicRow.AccountNumber,
                      unit: problematicRow.Unit || 'st'
                    }
                  }),
                  {
                    status: 404,
                    headers: {
                      'Content-Type': 'application/json',
                      ...corsHeaders
                    }
                  }
                );
              }
            }
            
            // Generic article not found error if specific article couldn't be identified
            return new Response(
              JSON.stringify({
                error: "article_not_found",
                message: "Article not found in Fortnox",
                errorDetails: errorDetails
              }),
              {
                status: 404,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders
                }
              }
            );
          }
        }
        
        // Add helpful context for specific error codes
        if (errorCode === 2001303) {
          errorMessage = `Account not found: ${errorMessage}. Please use an account between ${VALID_ACCOUNTS.revenue.min}-${VALID_ACCOUNTS.revenue.max}.`;
        }
        
        return new Response(
          JSON.stringify({
            error: `Fortnox API Error: HTTP ${fortnoxRes.status}`,
            details: errorDetails,
            fortnoxStatus: fortnoxRes.status,
            requestPayload: payload,
            errorCode: errorCode,
            message: errorMessage
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
