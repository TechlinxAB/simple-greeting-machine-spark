
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Environment variables for Supabase connection
// These can be configured to use env variables for different environments
const supabaseUrl = 'https://xojrleypudfrbmvejpow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc';

// Create a single instance of the Supabase client with improved configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'supabase.auth.token',
    detectSessionInUrl: true, // Enable session detection in URLs for auth redirects
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    },
    fetch: (url, options) => {
      // Enhanced fetch with retries for network issues
      return fetch(url, options).catch(err => {
        console.error('Network error in Supabase request:', err);
        throw err;
      });
    }
  },
  db: {
    schema: 'public',
  },
  realtime: {
    timeout: 60000, // Increased timeout for operations
  }
});
