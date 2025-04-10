
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = "/"
}: ProtectedRouteProps) {
  const { user, role, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && user && role && !allowedRoles.includes(role)) {
      toast.error(`You don't have permission to access this page`);
    }
  }, [user, role, isLoading, allowedRoles]);

  // While loading, don't render anything to avoid flashes
  if (isLoading) {
    return null;
  }
  
  // If the user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If the user doesn't have the required role, redirect to the specified path
  if (role && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // User has the required role, render the children
  return <>{children}</>;
}
