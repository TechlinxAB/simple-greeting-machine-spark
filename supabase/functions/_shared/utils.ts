
/**
 * Generate a UUID v4 - with crypto.randomUUID() fallback or custom implementation
 */
export function generateUUID(): string {
  // Use crypto.randomUUID() if available
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback implementation for environments without crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format error response for edge functions
 */
export function formatErrorResponse(error: any, status: number = 400): Response {
  // Extract meaningful error message
  let errorMessage = error?.message || "Unknown error occurred";
  let errorDetails = error;
  
  // Format the error response
  return new Response(
    JSON.stringify({
      error: errorMessage,
      details: errorDetails,
      status: status
    }),
    {
      status: status,
      headers: { "Content-Type": "application/json" }
    }
  );
}
