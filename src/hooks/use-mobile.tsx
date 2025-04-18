
import * as React from "react";

export const MOBILE_BREAKPOINT = 768;
export const LAPTOP_BREAKPOINT = 1366;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(newIsMobile);
    };
    
    checkMobile();
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    const handleResize = () => {
      checkMobile();
    };
    
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // @ts-ignore - For older browsers
      mql.addListener && mql.addListener(handleChange);
    }
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      } else {
        // @ts-ignore - For older browsers
        mql.removeListener && mql.removeListener(handleChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}

export function useIsLaptop() {
  const [isLaptop, setIsLaptop] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      return width >= MOBILE_BREAKPOINT && width <= LAPTOP_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLaptop = () => {
      const width = window.innerWidth;
      const newIsLaptop = width >= MOBILE_BREAKPOINT && width <= LAPTOP_BREAKPOINT;
      setIsLaptop(newIsLaptop);
    };
    
    checkLaptop();
    
    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${LAPTOP_BREAKPOINT}px)`);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsLaptop(e.matches);
    };
    
    const handleResize = () => {
      checkLaptop();
    };
    
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      // @ts-ignore - For older browsers
      mql.addListener && mql.addListener(handleChange);
    }
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", handleChange);
      } else {
        // @ts-ignore - For older browsers
        mql.removeListener && mql.removeListener(handleChange);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isLaptop;
}
