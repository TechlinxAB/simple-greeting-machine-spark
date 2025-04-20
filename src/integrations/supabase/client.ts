
// Re-export the Supabase client from the central lib directory
// This ensures we have a single source of truth for the Supabase client
import { supabase } from "@/lib/supabase";
import { environment } from "@/config/environment";

export { supabase };

// Also export any helper functions that might be useful
export { signInUser, signUpUser } from "@/lib/supabase";

// Check for custom Supabase connection values in localStorage
const customSupabaseUrl = localStorage.getItem("custom_supabase_url");
const customSupabaseAnonKey = localStorage.getItem("custom_supabase_anon_key");

// Export environment configuration for Supabase, preferring custom values if available
export const supabaseConfig = {
  url: customSupabaseUrl || environment.supabase.url,
  anonKey: customSupabaseAnonKey || environment.supabase.anonKey,
  projectRef: customSupabaseUrl ? 
    environment.supabase.projectRef : 
    'xojrleypudfrbmvejpow'
};
