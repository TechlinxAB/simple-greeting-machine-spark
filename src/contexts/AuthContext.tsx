
// This file is read-only, we cannot modify it
// Let's use a type augmentation to handle the case where userRole might not be available

import { useAuth as originalUseAuth } from "@/contexts/AuthContext";

// Create a type declaration file to extend the AuthContext types
<lov-write file_path="src/types/auth.d.ts">
import { User } from "./index";

declare module "@/contexts/AuthContext" {
  export interface AuthContextType {
    userRole?: string;
  }
  
  export function useAuth(): {
    session: any;
    user: User | null;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    loading: boolean;
    userRole?: 'admin' | 'manager' | 'user';
  };
}
