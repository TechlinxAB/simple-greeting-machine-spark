
import * as React from "react";

export const MOBILE_BREAKPOINT = 640;
export const TABLET_BREAKPOINT = 1024;

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
      console.log('Mobile check:', { windowWidth: window.innerWidth, isMobile: newIsMobile });
      setIsMobile(newIsMobile);
    };
    
    checkMobile();
    
    const handleResize = () => {
      checkMobile();
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isMobile;
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      return windowWidth >= MOBILE_BREAKPOINT && windowWidth < TABLET_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTablet = () => {
      const windowWidth = window.innerWidth;
      const newIsTablet = windowWidth >= MOBILE_BREAKPOINT && windowWidth < TABLET_BREAKPOINT;
      console.log('Tablet check:', { windowWidth, isTablet: newIsTablet });
      setIsTablet(newIsTablet);
    };
    
    checkTablet();
    
    const handleResize = () => {
      checkTablet();
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isTablet;
}

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= TABLET_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDesktop = () => {
      const windowWidth = window.innerWidth;
      const newIsDesktop = windowWidth >= TABLET_BREAKPOINT;
      console.log('Desktop check:', { windowWidth, isDesktop: newIsDesktop });
      setIsDesktop(newIsDesktop);
    };
    
    checkDesktop();
    
    const handleResize = () => {
      checkDesktop();
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isDesktop;
}

// Combined hook for easier use
export function useResponsiveLayout() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isLaptopOrLarger: isDesktop,
    isTabletOrLarger: isTablet || isDesktop
  };
}
