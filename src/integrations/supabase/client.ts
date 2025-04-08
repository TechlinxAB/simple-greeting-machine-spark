
// Re-export the Supabase client from the central lib directory
// This ensures we have a single source of truth for the Supabase client
import { supabase } from "@/lib/supabase";
export { supabase };

// Also export any helper functions that might be useful
export { signInUser, signUpUser } from "@/lib/supabase";
