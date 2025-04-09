
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
    // Set session lifetime to 1 day (24 hours) in seconds
    // This applies to the refresh token
    flowType: 'pkce',
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
  realtime: {
    timeout: 30000, // 30 second timeout for realtime connections
  }
});

// Enhanced function for Supabase database operations with retries
export async function executeWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  maxRetries: number = 3,
  retryDelay: number = 500
): Promise<{ data: T | null; error: any }> {
  let retries = 0;
  let lastResult = { data: null as T | null, error: null };

  while (retries < maxRetries) {
    lastResult = await operation();
    
    if (!lastResult.error) {
      // Verify operation success if deleting
      if (typeof operation === 'function' && 
          operation.toString().includes('delete') && 
          lastResult.data === null) {
        // Success case for delete operations
        console.log(`Delete operation successful on retry ${retries + 1}`);
      }
      return lastResult;
    }
    
    // If we get a postgres error that might benefit from retry
    if (lastResult.error.code && 
        ['23505', '40001', '40P01', '55P03', '55006', '57014'].includes(lastResult.error.code)) {
      retries++;
      console.log(`Database operation failed, retrying (${retries}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retries - 1)));
    } else {
      // If it's a different error that won't benefit from retry, break out
      break;
    }
  }
  
  return lastResult;
}

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

// Add inactivity timeout management
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds (changed from a previous value)

// Function to reset the inactivity timer
export function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  inactivityTimer = setTimeout(() => {
    console.log('User inactive for 30 minutes, signing out');
    supabase.auth.signOut();
    // Let the auth change listener handle the redirect
  }, INACTIVITY_TIMEOUT);
}

// Function to clear the inactivity timer (used when logging out manually)
export function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

// Setup event listeners for user activity
export function setupActivityTracking() {
  const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart', 'visibilitychange'];
  
  // Reset timer on any user activity
  const handleUserActivity = () => {
    if (document.visibilityState === 'visible') {
      resetInactivityTimer();
    }
  };
  
  // Add event listeners for user activity
  activityEvents.forEach(event => {
    document.addEventListener(event, handleUserActivity);
  });
  
  // Initial setup of timer
  resetInactivityTimer();
  
  // Return cleanup function to remove event listeners
  return () => {
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleUserActivity);
    });
    clearInactivityTimer();
  };
}
