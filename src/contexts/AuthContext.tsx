import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, setupActivityTracking, clearInactivityTimer } from "@/lib/supabase";
import { toast } from "sonner";
import { signInUser } from "@/lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  loadingTimeout: false,
  role: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  resetLoadingState: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loadingTimerId, setLoadingTimerId] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Get React Router hooks - now they will work because AuthProvider is inside BrowserRouter
  const navigate = useNavigate();
  const location = useLocation();
  
  // Reset loading state function
  const resetLoadingState = () => {
    setIsLoading(true);
    setLoadingTimeout(false);
    // Initialize session check again
    initialSession();
  };

  // Handle profile fetching with improved retry mechanism
  const fetchUserProfile = async (userId: string, retries = 2) => {
    let attempt = 0;
    
    // Add initial delay to ensure database trigger has time to execute
    await new Promise(resolve => setTimeout(resolve, 300));
    
    while (attempt < retries) {
      try {
        console.log(`Attempt ${attempt + 1}/${retries}: Fetching user profile for ID: ${userId}`);
        
        // Use any() type assertion to bypass TypeScript error temporarily
        // This is a workaround for the TypeScript errors in Supabase queries
        const { data, error } = await supabase
          .from("profiles")
          .select("role, name, avatar_url")
          .eq("id", userId as any)
          .maybeSingle();
        
        if (error) {
          console.error(`Attempt ${attempt + 1}/${retries}: Error fetching user profile:`, error);
          attempt++;
          // Add exponential backoff, but shorter
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(1.5, attempt)));
        } else if (data) {
          console.log("Profile fetched successfully:", data);
          setRole(data.role);
          return;
        } else {
          // No data but no error either - profile might not be created yet due to trigger delay
          console.log(`Attempt ${attempt + 1}/${retries}: User profile not found yet, retrying...`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(1.5, attempt)));
        }
      } catch (err) {
        console.error(`Attempt ${attempt + 1}/${retries}: Failed to fetch profile:`, err);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(1.5, attempt)));
      }
    }
    
    console.warn("Maximum retries reached for fetching user profile");
    // Just continue even if profile fetch fails - don't block the user
    setIsLoading(false);
  };

  // Initial session check with timeout and better handling
  const initialSession = async () => {
    try {
      // Clear any existing timeout
      if (loadingTimerId) {
        clearTimeout(loadingTimerId);
      }
      
      // Set timeout for loading
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setLoadingTimeout(true);
          console.warn("Loading timeout reached - redirecting to login");
          
          // If loading takes too long, redirect to login
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        }
      }, 10000); // 10 seconds timeout (reduced from 30)
      
      setLoadingTimerId(timeoutId);
      
      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No session, clear states and redirect to login
        setSession(null);
        setUser(null);
        setRole(null);
        setIsLoading(false);
        clearTimeout(timeoutId);
        
        // Only redirect to login if not already there
        if (location.pathname !== '/login' && location.pathname !== '/register') {
          navigate('/login');
        }
        return;
      }
      
      // We have a session
      setSession(session);
      setUser(session.user);

      // Fetch user role
      await fetchUserProfile(session.user.id);
      
      setIsLoading(false);
      clearTimeout(timeoutId);
    } catch (err) {
      console.error("Session initialization error:", err);
      setIsLoading(false);
      
      // Redirect to login on error
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    // Set up activity tracking - modify the inactivity timeout to 30 minutes
    const cleanupActivityTracking = setupActivityTracking();
    
    // Set up listener for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          // Clear all auth state
          setSession(null);
          setUser(null);
          setRole(null);
          setIsLoading(false);
          setLoadingTimeout(false);
          
          // Navigate to login if not already there
          if (location.pathname !== '/login') {
            navigate('/login');
          }
          return;
        }
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          // Fetch user role with debounce to avoid race conditions
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        }
      }
    );

    // Start initial session check
    initialSession();

    return () => {
      // Clean up
      authListener.subscription.unsubscribe();
      cleanupActivityTracking();
      
      if (loadingTimerId) {
        clearTimeout(loadingTimerId);
      }
    };
  }, [navigate, location.pathname]);

  const signIn = async (email: string, password: string) => {
    try {
      const { session, user } = await signInUser(email, password);
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) throw error;
      
      if (data.user) {
        console.log("Signup successful, user data:", data.user);
      }
      
      return;
    } catch (error: any) {
      console.error("Sign up error:", error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Clear inactivity timer when manually signing out
      clearInactivityTimer();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth state
      setSession(null);
      setUser(null);
      setRole(null);
      
      toast.success("Signed out successfully");
      
      // Redirect to login
      navigate('/login');
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
          // Use any() type assertion to bypass TypeScript error temporarily
          const { error } = await supabase
            .from("profiles")
            .update({
              updated_at: new Date().toISOString(),
              ...userMetadata,
            } as any)
            .eq("id", user.id as any);

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
        loadingTimeout,
        role,
        signIn,
        signUp,
        signOut,
        updateProfile,
        resetLoadingState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
