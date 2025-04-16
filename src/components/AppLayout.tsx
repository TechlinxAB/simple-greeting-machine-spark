
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

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
      { title: "Administration", href: "/administration", showIf: isManagerOrAdmin },
      { title: "Settings", href: "/settings", showIf: isAdmin },
      { title: "Profile", href: "/profile" },
    ];
    
    return (
      <div className="flex flex-col p-4 space-y-2">
        {links
          .filter(link => link.showIf !== false)
          .map((link) => (
            <Button 
              key={link.title}
              variant="ghost" 
              className="justify-start text-left w-full py-6 text-base"
              onClick={() => {
                navigate(link.href);
                setMobileSidebarOpen(false);
              }}
            >
              {link.title}
            </Button>
          ))}
        <div className="pt-4 border-t mt-4">
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
              className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-sm border"
              aria-label="Open navigation menu"
            >
              <Menu />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="px-4 pt-4 pb-2 text-lg font-semibold">Navigation Menu</DrawerTitle>
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
            className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-sm border"
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
          <SheetTitle className="px-4 pt-4 pb-2 text-lg font-semibold">Navigation Menu</SheetTitle>
          <MobileMenu />
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}
        
        <div className="flex-1 flex flex-col relative">
          <Header className="sticky top-0 z-40" /> {/* Ensure header is below sidebar z-index */}
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
        
        {/* Always render the mobile trigger outside the flow for better visibility */}
        <MobileSidebarTrigger />
      </div>
    </SidebarProvider>
  );
}
