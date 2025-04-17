
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
    redirectBaseUrl: string;
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
    // Changed from '/settings?tab=fortnox' to '/settings' to simplify the redirect URI
    // This will make it easier to match with what's registered in Fortnox
    redirectBaseUrl: '/settings',
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'logos',
    newsBucket: 'news',
  },
  features: {
    enableEdgeFunctions: true,
  }
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
    redirectBaseUrl: '/settings',
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'logos',
    newsBucket: 'news',
  },
  features: {
    // Set to false if your self-hosted instance doesn't have edge functions
    enableEdgeFunctions: true,
  }
};
*/
