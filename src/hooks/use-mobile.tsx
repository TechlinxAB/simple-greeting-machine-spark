
import * as React from "react";

export const MOBILE_BREAKPOINT = 768;
export const LAPTOP_BREAKPOINT = 1366; // Typical 13-inch laptop width

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
    
    console.log("Setting up mobile detection, current width:", window.innerWidth, "isMobile:", isMobile);
    
    // Set up media query listener for better performance
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Handle media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      console.log("Media query changed:", e.matches, "screen width:", window.innerWidth);
      setIsMobile(e.matches);
    };
    
    // Always use resize events as a backup
    const handleResize = () => {
      console.log("Window resized to:", window.innerWidth);
      checkMobile();
    };
    
    // Use both event listeners for maximum compatibility
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // Older browsers
      console.log("Using legacy addListener for media query");
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

// New hook for laptop detection
export function useIsLaptop() {
  const [isLaptop, setIsLaptop] = React.useState<boolean>(() => {
    // Initialize with a value based on window width if available
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      return width >= MOBILE_BREAKPOINT && width <= LAPTOP_BREAKPOINT;
    }
    return false; // Default for SSR
  });

  React.useEffect(() => {
    // Check if window is available (for SSR)
    if (typeof window === 'undefined') return;

    // Set the initial value based on window width
    const checkLaptop = () => {
      const width = window.innerWidth;
      const newIsLaptop = width >= MOBILE_BREAKPOINT && width <= LAPTOP_BREAKPOINT;
      setIsLaptop(newIsLaptop);
    };
    
    // Run immediately to set initial state
    checkLaptop();
    
    console.log("Setting up laptop detection, current width:", window.innerWidth, "isLaptop:", isLaptop);
    
    // Set up media query listener for better performance
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${LAPTOP_BREAKPOINT}px)`);
    
    // Handle media query changes
    const handleChange = (e: MediaQueryListEvent) => {
      console.log("Laptop media query changed:", e.matches, "screen width:", window.innerWidth);
      setIsLaptop(e.matches);
    };
    
    // Always use resize events as a backup
    const handleResize = () => {
      console.log("Window resized to:", window.innerWidth, "(laptop check)");
      checkLaptop();
    };
    
    // Use both event listeners for maximum compatibility
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // Older browsers
      console.log("Using legacy addListener for media query");
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

  return isLaptop;
}
