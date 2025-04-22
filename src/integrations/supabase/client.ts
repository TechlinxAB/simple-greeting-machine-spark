
// Re-export the Supabase client from the central lib directory
// This ensures we have a single source of truth for the Supabase client
import { supabase } from "@/lib/supabase";
import { getEnvironmentConfig } from "@/config/environment";

export { supabase };

// Also export any helper functions that might be useful
export { signInUser, signUpUser } from "@/lib/supabase";

// Get the current environment configuration
const config = getEnvironmentConfig();

// Export environment configuration for Supabase
export const supabaseConfig = {
  url: config.supabase.url,
  anonKey: config.supabase.anonKey,
  projectRef: config.supabase.projectRef
};

/**
 * Update Supabase client with new configuration
 * Note: This doesn't update the actual client instance due to Supabase SDK limitations
 * A page reload is required for the changes to take effect
 */
export function updateSupabaseConfig(newConfig: {
  url?: string;
  anonKey?: string;
  projectRef?: string;
}): void {
  // Store the new config in localStorage
  const config = getEnvironmentConfig();
  const updatedConfig = {
    ...config,
    supabase: {
      ...config.supabase,
      ...newConfig
    }
  };
  
  localStorage.setItem('environment_config', JSON.stringify(updatedConfig));
  console.log('Supabase configuration updated. Reload required for changes to take effect.');
}

/**
 * Get the current Supabase configuration
 */
export function getCurrentSupabaseConfig() {
  return {
    url: config.supabase.url,
    anonKey: config.supabase.anonKey,
    projectRef: config.supabase.projectRef
  };
}
