
import * as React from "react";

export const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Initialize with a value based on window width if available
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false; // Default for SSR
  });

  React.useEffect(() => {
    // Check if window is available (for SSR)
    if (typeof window === 'undefined') return;

    // Set the initial value based on window width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Run immediately to set initial state
    checkMobile();
    
    // Set up media query listener for better performance
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handle media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    // Always use resize events as a backup
    const handleResize = () => {
      checkMobile();
    };
    
    // Use both event listeners for maximum compatibility
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    }
    
    // Always add resize listener as a fallback
    window.addEventListener("resize", handleResize);
    
    // Clean up event listeners
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}
