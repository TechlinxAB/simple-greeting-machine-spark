
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

// Extend the Supabase User type to include user_metadata
declare module "@supabase/supabase-js" {
  interface User extends SupabaseUser {
    user_metadata?: {
      name?: string;
      avatar_url?: string;
      date_of_birth?: string;
      role?: string;
      email_verified?: boolean;
    };
  }
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  loadingTimeout: boolean;
  role: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar_url?: string; date_of_birth?: string }) => Promise<void>;
  resetLoadingState: () => void;
}
