
// Helper functions for Supabase edge functions

/**
 * Generates a standard error response with CORS headers
 */
export function errorResponse(
  message: string, 
  status: number = 500, 
  corsHeaders: Record<string, string>,
  details?: any
) {
  return new Response(
    JSON.stringify({ 
      error: message,
      details: details || null,
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Generates a standard success response with CORS headers
 */
export function successResponse(
  data: any, 
  corsHeaders: Record<string, string>
) {
  return new Response(
    JSON.stringify({ 
      data,
      success: true
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Safely parses JSON from a request
 */
export async function parseRequestJson(req: Request) {
  try {
    return await req.json();
  } catch (e) {
    throw new Error("Invalid request body - could not parse JSON");
  }
}

/**
 * Validates required fields in a request object
 */
export function validateRequiredFields(
  data: Record<string, any>, 
  requiredFields: string[]
) {
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  return true;
}

/**
 * Generate a session ID for tracing requests
 */
export function generateSessionId() {
  return crypto.randomUUID().substring(0, 8);
}
