
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { signInUser } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar_url?: string; date_of_birth?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  role: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  // Handle profile fetching with improved retry mechanism
  const fetchUserProfile = async (userId: string, retries = 3) => {
    let attempt = 0;
    
    // Add initial delay to ensure database trigger has time to execute
    await new Promise(resolve => setTimeout(resolve, 500));
    
    while (attempt < retries) {
      try {
        console.log(`Attempt ${attempt + 1}/${retries}: Fetching user profile for ID: ${userId}`);
        const { data, error } = await supabase
          .from("profiles")
          .select("role, name, avatar_url")
          .eq("id", userId)
          .maybeSingle();
        
        if (error) {
          console.error(`Attempt ${attempt + 1}/${retries}: Error fetching user profile:`, error);
          attempt++;
          // Add exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, attempt)));
        } else if (data) {
          console.log("Profile fetched successfully:", data);
          setRole(data.role);
          return;
        } else {
          // No data but no error either - profile might not be created yet due to trigger delay
          console.log(`Attempt ${attempt + 1}/${retries}: User profile not found yet, retrying...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, attempt)));
        }
      } catch (err) {
        console.error(`Attempt ${attempt + 1}/${retries}: Failed to fetch profile:`, err);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, attempt)));
      }
    }
    
    console.warn("Maximum retries reached for fetching user profile");
  };

  useEffect(() => {
    // Set up listener for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user role after user authentication
          await fetchUserProfile(session.user.id);
        } else {
          setRole(null);
        }

        setIsLoading(false);
      }
    );

    // Initial session check
    const initialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user role
          await fetchUserProfile(session.user.id);
        }
      } catch (err) {
        console.error("Session initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initialSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { session } = await signInUser(email, password);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { user } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (user) {
        console.log("Signup successful, user data:", user);
      }
      
      return;
    } catch (error: any) {
      console.error("Sign up error:", error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
      throw error;
    }
  };

  const updateProfile = async (userMetadata: { name?: string; avatar_url?: string; date_of_birth?: string }) => {
    try {
      if (!user) throw new Error("No user logged in");

      // Update profile table with retry mechanism
      let retries = 3;
      let success = false;
      let lastError = null;

      while (retries > 0 && !success) {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({
              updated_at: new Date().toISOString(),
              ...userMetadata,
            })
            .eq("id", user.id);

          if (error) {
            lastError = error;
            retries--;
            // Add exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, 3 - retries)));
          } else {
            success = true;
          }
        } catch (err) {
          lastError = err;
          retries--;
          // Add exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, 3 - retries)));
        }
      }

      if (!success && lastError) {
        throw lastError;
      }
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Error updating profile");
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        role,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
