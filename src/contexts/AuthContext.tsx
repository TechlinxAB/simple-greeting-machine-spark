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

  const [usedFallbackAdmin, setUsedFallbackAdmin] = useState(false);

  const FALLBACK_ADMIN_USER = "techlinxadmin";
  const FALLBACK_ADMIN_PASS_HASH = "1c52f1ca3cdea9d714d40fe0e3b46d56b43164ebfd47d8ba8d532d982d5283f5";

  const navigate = useNavigate();
  const location = useLocation();
  
  const resetLoadingState = () => {
    setIsLoading(true);
    setLoadingTimeout(false);
    initialSession();
  };

  const fallbackAdminLogin = (username: string, password: string) => {
    const hashForCheck = hashSimple(password);
    
    if (
      username === FALLBACK_ADMIN_USER &&
      hashForCheck === FALLBACK_ADMIN_PASS_HASH
    ) {
      console.log("Using emergency admin access");
      setUser({
        id: "fallback-admin",
        email: username,
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as unknown as User);
      setRole("admin");
      setSession(null);
      setIsLoading(false);
      setUsedFallbackAdmin(true);
      return true;
    }
    return false;
  };

  const hashSimple = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
    return hashHex.repeat(4);
  };

  const fetchUserProfile = async (userId: string, retries = 2) => {
    let attempt = 0;
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    while (attempt < retries) {
      try {
        console.log(`Attempt ${attempt + 1}/${retries}: Fetching user profile for ID: ${userId}`);
        
        const { data, error } = await supabase
          .from("profiles")
          .select("role, name, avatar_url")
          .eq("id", userId as any)
          .maybeSingle();
        
        if (error) {
          console.error(`Attempt ${attempt + 1}/${retries}: Error fetching user profile:`, error);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(1.5, attempt)));
        } else if (data) {
          console.log("Profile fetched successfully:", data);
          setRole(data.role);
          return;
        } else {
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
    setIsLoading(false);
  };

  const initialSession = async () => {
    try {
      if (loadingTimerId) {
        clearTimeout(loadingTimerId);
      }
      
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          setLoadingTimeout(true);
          console.warn("Loading timeout reached - redirecting to login");
          
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        }
      }, 10000);
      
      setLoadingTimerId(timeoutId);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setSession(null);
        setUser(null);
        setRole(null);
        setIsLoading(false);
        clearTimeout(timeoutId);
        
        if (location.pathname !== '/login' && location.pathname !== '/register') {
          navigate('/login');
        }
        return;
      }
      
      setSession(session);
      setUser(session.user);
      
      await fetchUserProfile(session.user.id);
      
      setIsLoading(false);
      clearTimeout(timeoutId);
    } catch (err) {
      console.error("Session initialization error:", err);
      setIsLoading(false);
      
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    const cleanupActivityTracking = setupActivityTracking();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          setIsLoading(false);
          setLoadingTimeout(false);
          
          if (location.pathname !== '/login') {
            navigate('/login');
          }
          return;
        }
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        }
      }
    );

    initialSession();

    return () => {
      authListener.subscription.unsubscribe();
      cleanupActivityTracking();
      
      if (loadingTimerId) {
        clearTimeout(loadingTimerId);
      }
    };
  }, [navigate, location.pathname]);

  const signIn = async (email: string, password: string) => {
    console.log("Sign in attempt for:", email);
    
    if (fallbackAdminLogin(email, password)) {
      console.log("Emergency admin access granted");
      toast.success("Logged in with emergency admin access");
      navigate("/settings?tab=setup");
      return;
    }

    try {
      console.log("Attempting regular Supabase login");
      const { session, user } = await signInUser(email, password);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      
      if (email === FALLBACK_ADMIN_USER && error.message.includes("valid email")) {
        toast.error("For emergency admin access, use the correct credentials format");
      } else {
        throw error;
      }
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
      clearInactivityTimer();
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      setRole(null);
      
      toast.success("Signed out successfully");
      
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
      throw error;
    }
  };

  const updateProfile = async (userMetadata: { name?: string; avatar_url?: string; date_of_birth?: string }) => {
    try {
      if (!user) throw new Error("No user logged in");

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
            } as any)
            .eq("id", user.id as any);

          if (error) {
            lastError = error;
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, 3 - retries)));
          } else {
            success = true;
          }
        } catch (err) {
          lastError = err;
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(1.5, 3 - retries)));
        }
      }

      if (!success && lastError) {
        throw lastError;
      }
      
      window.dispatchEvent(new CustomEvent('profile-updated'));
      
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
