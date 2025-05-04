
/**
 * Generate a UUID v4 compatible string
 * This is a polyfill for crypto.randomUUID() for environments where it's not available
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers and Deno)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn('crypto.randomUUID failed, falling back to polyfill');
    }
  }
  
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Safe substring function that handles nulls and undefined
 */
export function safeSubstring(str: string | null | undefined, start: number, end?: number): string {
  if (!str) return '';
  return str.substring(start, end);
}
