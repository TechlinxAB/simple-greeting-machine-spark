
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Set the initial value based on window width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Run immediately
    checkMobile();
    
    // Set up media query listener
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // Modern event listener (for newer browsers)
    if (mql.addEventListener) {
      mql.addEventListener("change", checkMobile);
    } else {
      // Fallback for older browsers
      window.addEventListener("resize", checkMobile);
    }
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", checkMobile);
      } else {
        window.removeEventListener("resize", checkMobile);
      }
    };
  }, []);

  // Return false as default while waiting for the effect
  return isMobile === undefined ? false : isMobile;
}
