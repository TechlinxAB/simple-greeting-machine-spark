// Re-export the Supabase client from the central lib directory
// This ensures we have a single source of truth for the Supabase client
import { supabase } from "@/lib/supabase";
import { environment } from "@/config/environment";

export { supabase };

// Also export any helper functions
export { signInUser, signUpUser } from "@/lib/supabase";

// No more projectRef fallback, just expose config (URL, anonKey, projectRef) always as set
export const supabaseConfig = {
  url: environment.supabase.url,
  anonKey: environment.supabase.anonKey,
  projectRef: environment.supabase.projectRef,
};
