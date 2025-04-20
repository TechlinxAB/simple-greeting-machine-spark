
/**
 * Environment Configuration
 * 
 * This file centralizes all environment-specific configuration to make it easier
 * to switch between different environments (cloud Supabase, self-hosted Supabase).
 */

// Check for custom Supabase connection from localStorage
const customSupabaseUrl = localStorage.getItem("custom_supabase_url");
const customSupabaseAnonKey = localStorage.getItem("custom_supabase_anon_key");

interface EnvironmentConfig {
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    projectRef: string;
  };
  // Fortnox Configuration
  fortnox: {
    authUrl: string;
    apiUrl: string;
    redirectPath: string;
    refreshSecret: string;
  };
  // Storage Configuration
  storage: {
    avatarBucket: string;
    logosBucket: string;
    newsBucket: string;
  };
  // Feature Flags
  features: {
    enableEdgeFunctions: boolean;
  };
  // Allowed domains for redirects
  allowedDomains?: string[]; // Optional list of allowed domains
}

/**
 * Extract project reference from Supabase URL
 */
function extractProjectRef(url: string): string {
  try {
    // Extract the subdomain from the URL
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Default fallback for custom domains or invalid URLs
    return 'current-project';
  } catch (e) {
    console.error("Error extracting project ref:", e);
    return 'current-project';
  }
}

/**
 * Environment configuration with a preference for custom values from localStorage
 * if available, otherwise fallback to default cloud-hosted Supabase values
 */
export const environment: EnvironmentConfig = {
  supabase: {
    // Use custom values if available, else default
    url: customSupabaseUrl || 'https://xojrleypudfrbmvejpow.supabase.co',
    anonKey: customSupabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc',
    // Extract project ref from the URL
    projectRef: customSupabaseUrl ? 
      extractProjectRef(customSupabaseUrl) : 
      'xojrleypudfrbmvejpow',
  },
  fortnox: {
    authUrl: 'https://apps.fortnox.se/oauth-v1/auth',
    apiUrl: 'https://api.fortnox.se/3',
    redirectPath: '/settings?tab=fortnox',
    // Use a static secret key for the API authentication
    // The actual secret is stored in the Supabase Edge Function environment
    refreshSecret: 'fortnox-refresh-secret-key'
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'application-logo',
    newsBucket: 'news_images',
  },
  features: {
    enableEdgeFunctions: true,
  },
  // Add allowed domains for OAuth redirects
  allowedDomains: [
    'timetracking.techlinx.se',
    '5a7b22d3-f455-4d7b-888a-7f87ae8dba3f.lovableproject.com',
    'localhost:5173', // For local development
  ]
};

/**
 * Get the fully qualified redirect URI for OAuth flows
 * This function considers the current origin and registered allowed domains
 */
export function getRedirectUri(): string {
  const origin = window.location.origin;
  const path = environment.fortnox.redirectPath;
  
  // Check if the current origin is allowed explicitly (if allowedDomains is provided)
  if (environment.allowedDomains) {
    // Parse the domain from the origin
    const currentDomain = origin.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    
    // Check if any allowed domain is contained in the current domain
    const isDomainAllowed = environment.allowedDomains.some(
      allowedDomain => currentDomain.includes(allowedDomain) || 
                        currentDomain === allowedDomain.replace(/:\d+$/, '')
    );
    
    if (!isDomainAllowed) {
      console.warn(`Current origin (${origin}) is not in the allowed domains list. OAuth redirects may fail.`);
    }
  }
  
  return `${origin}${path}`;
}
