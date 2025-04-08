
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, LogOut } from "lucide-react";

export function AppLayout() {
  const { user, isLoading, loadingTimeout, signOut, resetLoadingState } = useAuth();

  const handleForceReload = () => {
    window.location.reload();
  };

  const handleForceLogout = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Force logout error:", error);
      // Clear local storage as a fallback
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {loadingTimeout ? (
          <div className="w-full max-w-md space-y-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Loading Timeout</AlertTitle>
              <AlertDescription>
                The application is taking longer than expected to load. This might be due to network 
                issues or server problems.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={resetLoadingState} 
                className="flex items-center justify-center gap-2"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={handleForceReload} 
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Force Reload Page
              </Button>
              
              <Button 
                onClick={handleForceLogout} 
                className="flex items-center justify-center gap-2"
                variant="destructive"
              >
                <LogOut className="h-4 w-4" />
                Force Logout
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-muted-foreground">Loading your workspace...</p>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
