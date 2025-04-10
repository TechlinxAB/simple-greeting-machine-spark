
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

// Define a type for valid table names to be used with deleteRecord
type TableName = "clients" | "invoice_items" | "invoices" | "products" | "time_entries" | "news_posts" | "profiles" | "system_settings";

/**
 * Improved delete operation with better error handling
 */
export async function deleteRecord(
  table: TableName,
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`Attempting to delete ${table} with ID: ${id}`);
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error in delete operation for ${table}:`, error);
      
      // More detailed error handling based on error codes
      if (error.code === '23503') {
        return { 
          success: false, 
          error: `Cannot delete this record as it's being referenced by other records.` 
        };
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
        return { 
          success: false, 
          error: `Permission denied: You don't have the required permissions to delete this record.` 
        };
      }
      
      return { 
        success: false, 
        error: error.message || `Failed to delete ${table} record` 
      };
    }
    
    return { success: true, error: null };
  } catch (err) {
    console.error(`Unexpected error in delete operation for ${table}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
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

/**
 * Helper function to get the public URL for a file in storage
 * @param bucket The bucket name
 * @param path The file path
 * @returns The public URL for the file
 */
export function getStorageFileUrl(bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Checks if a logo exists in the app-logo bucket
 * @returns Promise resolving to true if a logo exists, false otherwise
 */
export async function checkLogoExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from('app-logo')
      .list();
      
    if (error) {
      console.error('Error checking if logo exists:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Unexpected error checking logo existence:', error);
    return false;
  }
}

/**
 * Uploads a logo to the app-logo bucket, ensuring only one logo exists
 * @param file The logo file to upload
 * @returns The public URL of the uploaded logo or null if upload failed
 */
export async function uploadAppLogo(file: File): Promise<string | null> {
  try {
    // We'll only ever have one logo file in the bucket
    const fileName = 'app-logo';
    const fileExt = file.name.split('.').pop();
    const filePath = `${fileName}.${fileExt}`;
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('app-logo')
      .upload(filePath, file, {
        upsert: true, // Replace any existing file
        contentType: file.type,
      });
      
    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return null;
    }
    
    // Return the public URL
    return getStorageFileUrl('app-logo', filePath);
  } catch (error) {
    console.error('Unexpected error uploading logo:', error);
    return null;
  }
}

/**
 * Removes the app logo from storage
 * @returns Promise resolving to true if removal was successful, false otherwise
 */
export async function removeAppLogo(): Promise<boolean> {
  try {
    // List all files in the app-logo bucket
    const { data, error: listError } = await supabase.storage
      .from('app-logo')
      .list();
      
    if (listError) {
      console.error('Error listing app logo files:', listError);
      return false;
    }
    
    if (!data || data.length === 0) {
      // No logo to remove
      return true;
    }
    
    // Delete all files in the bucket (should only be one)
    const { error: deleteError } = await supabase.storage
      .from('app-logo')
      .remove(data.map(file => file.name));
      
    if (deleteError) {
      console.error('Error removing app logo:', deleteError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error removing app logo:', error);
    return false;
  }
}
