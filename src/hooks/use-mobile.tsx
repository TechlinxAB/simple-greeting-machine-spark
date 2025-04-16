
import * as React from "react";

export const MOBILE_BREAKPOINT = 640; // Reduced from 768 to align with sm breakpoint in Tailwind
export const SMALL_SCREEN_BREAKPOINT = 1024; // Reduced from 1280 to align with lg breakpoint in Tailwind

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

// New utility for even smaller screens like phones
export function useIsExtraSmallScreen() {
  const [isExtraSmallScreen, setIsExtraSmallScreen] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 480; // Extra small screen breakpoint
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkExtraSmallScreen = () => {
      setIsExtraSmallScreen(window.innerWidth < 480);
    };
    
    checkExtraSmallScreen();
    
    const mql = window.matchMedia(`(max-width: 479px)`);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsExtraSmallScreen(e.matches);
    };
    
    const handleResize = () => {
      checkExtraSmallScreen();
    };
    
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // @ts-ignore
      mql.addListener && mql.addListener(handleChange);
    }
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      } else {
        // @ts-ignore
        mql.removeListener && mql.removeListener(handleChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isExtraSmallScreen;
}
