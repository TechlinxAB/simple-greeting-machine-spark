/**
 * Environment Configuration
 * 
 * This file centralizes all environment-specific configuration to make it easier
 * to switch between different environments (cloud Supabase, self-hosted Supabase).
 */

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
 * Default configuration for cloud-hosted Supabase
 */
export const environment: EnvironmentConfig = {
  supabase: {
    // Current cloud Supabase values (same as hardcoded in supabase.ts)
    url: 'https://xojrleypudfrbmvejpow.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc',
    projectRef: 'xojrleypudfrbmvejpow',
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
    logosBucket: 'logos',
    newsBucket: 'news',
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
 * To switch to a self-hosted Supabase instance:
 * 
 * 1. Uncomment the block below
 * 2. Update the values to match your self-hosted instance
 * 3. Comment out or remove the cloud config above
 */

/*
export const environment: EnvironmentConfig = {
  supabase: {
    // Replace with your self-hosted Supabase values
    url: 'https://supabase.techlinx.se',
    anonKey: 'your-anon-key-here',
    projectRef: 'your-project-ref-here',
  },
  fortnox: {
    authUrl: 'https://apps.fortnox.se/oauth-v1/auth',
    apiUrl: 'https://api.fortnox.se/3',
    redirectPath: '/settings?tab=fortnox',
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'logos',
    newsBucket: 'news',
  },
  features: {
    // Set to false if your self-hosted instance doesn't have edge functions
    enableEdgeFunctions: true,
  },
  allowedDomains: [
    'timetracking.techlinx.se',
    'your-other-domain.com',
  ]
};
*/

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
