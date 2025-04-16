
import * as React from "react";

export const MOBILE_BREAKPOINT = 768; // You can adjust this breakpoint if needed for 13-inch laptops
export const SMALL_SCREEN_BREAKPOINT = 1280; // Added for 13-inch laptops

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
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(newIsMobile);
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
    } else {
      // Older browsers
      // @ts-ignore - For older browsers that don't have addEventListener
      mql.addListener && mql.addListener(handleChange);
    }
    
    // Always add resize listener as a fallback
    window.addEventListener("resize", handleResize);
    
    // Clean up event listeners
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      } else {
        // Older browsers
        // @ts-ignore - For older browsers that don't have removeEventListener
        mql.removeListener && mql.removeListener(handleChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}

export function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = React.useState<boolean>(() => {
    // Initialize with a value based on window width if available
    if (typeof window !== 'undefined') {
      return window.innerWidth < SMALL_SCREEN_BREAKPOINT;
    }
    return false; // Default for SSR
  });

  React.useEffect(() => {
    // Check if window is available (for SSR)
    if (typeof window === 'undefined') return;

    // Set the initial value based on window width
    const checkSmallScreen = () => {
      const newIsSmallScreen = window.innerWidth < SMALL_SCREEN_BREAKPOINT;
      setIsSmallScreen(newIsSmallScreen);
    };
    
    // Run immediately to set initial state
    checkSmallScreen();
    
    // Set up media query listener for better performance
    const mql = window.matchMedia(`(max-width: ${SMALL_SCREEN_BREAKPOINT - 1}px)`);
    
    // Handle media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSmallScreen(e.matches);
    };
    
    // Always use resize events as a backup
    const handleResize = () => {
      checkSmallScreen();
    };
    
    // Use both event listeners for maximum compatibility
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // Older browsers
      // @ts-ignore - For older browsers that don't have addEventListener
      mql.addListener && mql.addListener(handleChange);
    }
    
    // Always add resize listener as a fallback
    window.addEventListener("resize", handleResize);
    
    // Clean up event listeners
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      } else {
        // Older browsers
        // @ts-ignore - For older browsers that don't have removeEventListener
        mql.removeListener && mql.removeListener(handleChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isSmallScreen;
}
