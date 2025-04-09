
import { User } from "./index";

declare module "@/contexts/AuthContext" {
  export interface AuthContextType {
    userRole?: string;
    role?: 'admin' | 'manager' | 'user';
  }
  
  export function useAuth(): {
    session: any;
    user: User | null;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    loading: boolean;
    isLoading?: boolean;
    loadingTimeout?: boolean;
    resetLoadingState?: () => void;
    role?: 'admin' | 'manager' | 'user';
    userRole?: string;
  };
}
