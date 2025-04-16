
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile, useIsSmallScreen } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";

export function AppLayout() {
  const { user, isLoading, loadingTimeout, signOut, resetLoadingState, role } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isSmallScreen = useIsSmallScreen();
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
      <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4">
        {loadingTimeout ? (
          <div className="w-full max-w-md space-y-3 sm:space-y-4">
            <Alert variant="destructive" className="mb-3 sm:mb-4">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <AlertTitle className="text-sm sm:text-base">Loading Timeout</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm">
                The application is taking longer than expected to load. This might be due to a session 
                expiration or network issues.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={resetLoadingState} 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                variant="outline"
              >
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={handleForceReload} 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Force Reload Page
              </Button>
              
              <Button 
                onClick={handleForceLogout} 
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                variant="destructive"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Return to Login
              </Button>
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
              You will be automatically redirected to the login page shortly...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-3 sm:border-4 border-primary border-t-transparent rounded-full mb-3 sm:mb-4"></div>
            <p className="text-xs sm:text-sm text-muted-foreground">Loading your workspace...</p>
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
      <div className="flex flex-col p-2 sm:p-3 space-y-0.5 sm:space-y-1">
        {links
          .filter(link => link.showIf !== false)
          .map((link) => (
            <Button 
              key={link.title}
              variant="ghost" 
              className="justify-start text-left w-full py-2 sm:py-3 text-xs sm:text-sm h-auto"
              onClick={() => {
                navigate(link.href);
                setMobileSidebarOpen(false);
              }}
            >
              {link.title}
            </Button>
          ))}
        <div className="pt-2 sm:pt-3 border-t mt-2 sm:mt-3">
          <Button 
            variant="destructive" 
            className="w-full text-xs sm:text-sm h-8 sm:h-9" 
            onClick={() => {
              signOut();
              setMobileSidebarOpen(false);
            }}
          >
            <LogOut className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
              className="md:hidden fixed top-2 left-2 z-50 bg-background/80 backdrop-blur-sm shadow-sm border h-7 w-7 sm:h-8 sm:w-8"
              aria-label="Open navigation menu"
            >
              <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1 text-sm sm:text-base font-semibold">Navigation Menu</DrawerTitle>
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
            className="md:hidden fixed top-2 left-2 z-50 bg-background/80 backdrop-blur-sm shadow-sm border h-7 w-7 sm:h-8 sm:w-8"
            aria-label="Open navigation menu"
          >
            <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="p-0 w-[80vw] sm:w-[300px] z-50"
        >
          <SheetTitle className="px-2 sm:px-3 pt-2 sm:pt-3 pb-1 text-sm sm:text-base font-semibold">Navigation Menu</SheetTitle>
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
          <Header />
          <main className="flex-1 p-0 overflow-x-hidden overflow-y-auto">
            <Outlet />
          </main>
        </div>
        
        {/* Always render the mobile trigger outside the flow for better visibility */}
        <MobileSidebarTrigger />
      </div>
    </SidebarProvider>
  );
}
