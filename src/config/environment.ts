/**
 * Environment Configuration
 * 
 * This file centralizes all environment-specific configuration to make it easier
 * to switch between different environments (cloud Supabase, self-hosted Supabase).
 */

import { EnvironmentConfig } from './environment';

export interface EnvironmentConfig {
  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    projectRef: string;
    // Database connection details
    dbUrl?: string;
    dbHost?: string;
    dbPort?: number;
    dbName?: string;
    dbUser?: string;
    // Changed from SUPABASE_DB_PASSWORD to DB_PASSWORD
    dbPassword?: string;
    serviceRoleKey?: string;
    jwtSecret?: string;
  };
  // Fortnox Configuration
  fortnox: {
    authUrl: string;
    apiUrl: string;
    redirectPath: string;
    refreshSecret: string;
    // Client ID and Secret are stored in system_settings table
    scopes?: string[];
    webhookEndpoint?: string;
  };
  // Storage Configuration
  storage: {
    avatarBucket: string;
    logosBucket: string;
    newsBucket: string;
    storageDomain?: string;
  };
  // Frontend Configuration
  frontend: {
    baseUrl?: string;
  };
  // Email/SMTP Configuration
  email?: {
    smtpServer?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    fromAddress?: string;
  };
  // CORS Configuration
  cors?: {
    allowedOrigins: string[];
  };
  // Edge Functions Configuration
  edgeFunctions?: {
    baseUrl?: string;
    timeoutMs?: number;
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
    // Database connection details
    dbUrl: 'postgresql://postgres:postgres@localhost:5432/postgres',
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'postgres',
    dbUser: 'postgres',
    dbPassword: 'postgres', // Default placeholder value
  },
  fortnox: {
    authUrl: 'https://apps.fortnox.se/oauth-v1/auth',
    apiUrl: 'https://api.fortnox.se/3',
    redirectPath: '/settings?tab=fortnox',
    // Use a static secret key for the API authentication
    // The actual secret is stored in the Supabase Edge Function environment
    refreshSecret: 'fortnox-refresh-secret-key',
    scopes: ['invoice', 'article', 'customer'],
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'logos',
    newsBucket: 'news',
  },
  frontend: {
    baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  },
  edgeFunctions: {
    timeoutMs: 10000,
  },
  features: {
    enableEdgeFunctions: true,
  },
  // Add allowed domains for OAuth redirects
  allowedDomains: [
    'timetracking.techlinx.se',
    '5a7b22d3-f455-4d7b-888a-7f87ae8dba3f.lovableproject.com',
    'localhost:5173', // For local development
  ],
  cors: {
    allowedOrigins: ['*']
  }
};

/**
 * Get the environment configuration, prioritizing localStorage overrides
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (typeof window === 'undefined') {
    return environment;
  }

  try {
    const localConfig = localStorage.getItem('environment_config');
    if (!localConfig) return environment;
    
    const parsedConfig = JSON.parse(localConfig);
    
    // Deep merge the default config with localStorage overrides
    return deepMerge(environment, parsedConfig);
  } catch (error) {
    console.error('Error loading environment config from localStorage:', error);
    return environment;
  }
}

/**
 * Helper function to deeply merge objects
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Save environment configuration to localStorage
 */
export function saveEnvironmentConfig(config: Partial<EnvironmentConfig>): void {
  try {
    const currentConfig = getEnvironmentConfig();
    const newConfig = deepMerge(currentConfig, config);
    localStorage.setItem('environment_config', JSON.stringify(newConfig));
    console.log('Environment configuration saved to localStorage');
  } catch (error) {
    console.error('Error saving environment configuration:', error);
    throw error;
  }
}

/**
 * Get the fully qualified redirect URI for OAuth flows
 * This function considers the current origin and registered allowed domains
 */
export function getRedirectUri(): string {
  const config = getEnvironmentConfig();
  const origin = config.frontend?.baseUrl || window.location.origin;
  const path = config.fortnox.redirectPath;
  
  // Check if the current origin is allowed explicitly (if allowedDomains is provided)
  if (config.allowedDomains) {
    // Parse the domain from the origin
    const currentDomain = origin.replace(/^https?:\/\//, '').replace(/:\d+$/, '');
    
    // Check if any allowed domain is contained in the current domain
    const isDomainAllowed = config.allowedDomains.some(
      allowedDomain => currentDomain.includes(allowedDomain) || 
                        currentDomain === allowedDomain.replace(/:\d+$/, '')
    );
    
    if (!isDomainAllowed) {
      console.warn(`Current origin (${origin}) is not in the allowed domains list. OAuth redirects may fail.`);
    }
  }
  
  return `${origin}${path}`;
}

/**
 * Reset all environment configuration to defaults
 */
export function resetEnvironmentConfig(): void {
  localStorage.removeItem('environment_config');
  console.log('Environment configuration reset to defaults');
}
