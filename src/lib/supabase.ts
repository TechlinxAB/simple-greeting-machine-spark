
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
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache' // Prevent browser caching of API responses
    },
    fetch: (url, options) => {
      const fetchOptions = {
        ...options,
        cache: 'no-store' as RequestCache // Force fetch to bypass cache
      };
      
      // Enhanced fetch with retries for network issues
      return fetch(url, fetchOptions)
        .catch(err => {
          console.error('Network error in Supabase request, retrying once:', err);
          // Retry once after a short delay
          return new Promise(resolve => setTimeout(resolve, 1000))
            .then(() => fetch(url, fetchOptions));
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

// Helper functions for auth operations
export async function signUpUser(email: string, password: string, name: string) {
  console.log(`Attempting to sign up user: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });
  
  if (error) {
    console.error('Sign up error:', error);
    throw error;
  }
  
  return data;
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Sign in error:', error);
    throw error;
  }
  
  return data;
}
