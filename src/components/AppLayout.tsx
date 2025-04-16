
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";

export function AppLayout() {
  const { user, isLoading, loadingTimeout, signOut, resetLoadingState, role } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleForceReload = () => {
    window.location.reload();
  };

  const handleForceLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Force logout error:", error);
      // Clear local storage as a fallback
      localStorage.clear();
      navigate('/login');
    }
  };

  // Auto-redirect to login after 5 seconds on timeout
  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    
    if (loadingTimeout) {
      redirectTimer = setTimeout(() => {
        console.log("Auto-redirecting to login after timeout");
        handleForceLogout();
      }, 20000); // 20 seconds before auto-redirect
    }
    
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [loadingTimeout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {loadingTimeout ? (
          <div className="w-full max-w-md space-y-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Loading Timeout</AlertTitle>
              <AlertDescription>
                The application is taking longer than expected to load. This might be due to a session 
                expiration or network issues.
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
                Return to Login
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground text-center mt-2">
              You will be automatically redirected to the login page shortly...
            </p>
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

  const isAdmin = role === "admin";
  const isManagerOrAdmin = role === "manager" || role === "admin";

  // Create simple direct menu for mobile view
  const MobileMenu = () => {
    const links = [
      { title: "Time Tracking", href: "/" },
      { title: "Dashboard", href: "/dashboard" },
      { title: "Clients", href: "/clients" },
      { title: "Products", href: "/products", showIf: isManagerOrAdmin },
      { title: "Invoices", href: "/invoices", showIf: isManagerOrAdmin },
      { title: "Reports", href: "/reports" },
      { title: "Administration", href: "/administration", showIf: isManagerOrAdmin },
      { title: "Settings", href: "/settings", showIf: isAdmin },
      { title: "Profile", href: "/profile" },
    ];
    
    return (
      <div className="flex flex-col p-3 space-y-1">
        {links
          .filter(link => link.showIf !== false)
          .map((link) => (
            <Button 
              key={link.title}
              variant="ghost" 
              className="justify-start text-left w-full py-4 sm:py-5 text-sm"
              onClick={() => {
                navigate(link.href);
                setMobileSidebarOpen(false);
              }}
            >
              {link.title}
            </Button>
          ))}
        <div className="pt-3 border-t mt-3">
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={() => {
              signOut();
              setMobileSidebarOpen(false);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  };

  // Mobile sidebar component
  const MobileSidebarTrigger = () => {
    if (!isMobile) return null;
    
    // Use Drawer component for iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      return (
        <Drawer open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <DrawerTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden fixed top-3 left-3 z-50 bg-background/80 backdrop-blur-sm shadow-sm border"
              aria-label="Open navigation menu"
            >
              <Menu />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="px-3 pt-3 pb-1 text-base font-semibold">Navigation Menu</DrawerTitle>
            <MobileMenu />
          </DrawerContent>
        </Drawer>
      );
    }
    
    // Use Sheet component for other mobile devices
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden fixed top-3 left-3 z-50 bg-background/80 backdrop-blur-sm shadow-sm border"
            aria-label="Open navigation menu"
          >
            <Menu />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="p-0 w-[80vw] sm:w-[300px] z-50"
        >
          <SheetTitle className="px-3 pt-3 pb-1 text-base font-semibold">Navigation Menu</SheetTitle>
          <MobileMenu />
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        {!isMobile && <AppSidebar />}
        
        <div className="flex-1 flex flex-col relative z-0 max-w-full overflow-x-hidden">
          <Header className="sticky top-0 z-30 left-0 right-0 w-full max-w-full" />
          <main className="flex-1 p-1 sm:p-3 md:p-4 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
        
        {/* Always render the mobile trigger outside the flow for better visibility */}
        <MobileSidebarTrigger />
      </div>
    </SidebarProvider>
  );
}
