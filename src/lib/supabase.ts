
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// For easier configuration between environments (dev, staging, prod)
// These can be configured in an .env file for different environments
// Current values point to the default Supabase project
const supabaseUrl = 'https://xojrleypudfrbmvejpow.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc';

// Create a single instance of the Supabase client with optimized configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'supabase.auth.token',
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
    fetch: (url, options) => {
      const fetchOptions = {
        ...options,
        // Set a reasonable timeout to prevent hanging requests
        signal: AbortSignal.timeout(15000), // 15 second timeout
      };
      
      return fetch(url, fetchOptions).catch(err => {
        console.error('Network error in Supabase request:', err);
        // Return a better error for timeout cases
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw err;
      });
    }
  },
  db: {
    schema: 'public',
  },
  realtime: {
    timeout: 30000, // 30 second timeout for realtime connections
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
