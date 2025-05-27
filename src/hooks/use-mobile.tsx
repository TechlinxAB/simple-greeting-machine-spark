
import * as React from "react";

export const MOBILE_BREAKPOINT = 640;
export const TABLET_BREAKPOINT = 1024;
export const LAPTOP_BREAKPOINT = 1280;

// Simplified function to check if we're on a laptop-sized screen
const isLaptopScreen = () => {
  if (typeof window === 'undefined') return false;
  
  const screenWidth = window.screen.width;
  const windowWidth = window.innerWidth;
  
  console.log('Screen detection:', {
    screenWidth,
    windowWidth,
    devicePixelRatio: window.devicePixelRatio
  });
  
  // If screen width is laptop-sized (>= 1280px), consider it a laptop
  // unless the window is significantly smaller (indicating heavy zoom or mobile browser)
  if (screenWidth >= 1280) {
    // Allow for some variance but not extreme shrinking
    const ratio = windowWidth / screenWidth;
    console.log('Laptop screen detected, window ratio:', ratio);
    
    // If window is at least 60% of screen width, treat as laptop
    return ratio >= 0.6;
  }
  
  return false;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      // Mobile if window width is below mobile breakpoint AND not a laptop screen
      return window.innerWidth < MOBILE_BREAKPOINT && !isLaptopScreen();
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT && !isLaptopScreen();
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
      
      // Never consider laptop screens as tablets
      if (isLaptopScreen()) {
        return false;
      }
      
      return windowWidth >= MOBILE_BREAKPOINT && windowWidth < LAPTOP_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTablet = () => {
      const windowWidth = window.innerWidth;
      
      // Never consider laptop screens as tablets
      if (isLaptopScreen()) {
        console.log('Laptop screen detected, not tablet');
        setIsTablet(false);
        return;
      }
      
      const newIsTablet = windowWidth >= MOBILE_BREAKPOINT && windowWidth < LAPTOP_BREAKPOINT;
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

export function useIsLaptop() {
  const [isLaptop, setIsLaptop] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      
      // Always consider laptop screens as laptops
      if (isLaptopScreen()) {
        return true;
      }
      
      return windowWidth >= LAPTOP_BREAKPOINT && windowWidth <= 1920;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLaptop = () => {
      const windowWidth = window.innerWidth;
      
      // Always consider laptop screens as laptops
      if (isLaptopScreen()) {
        console.log('Laptop screen detected, setting as laptop');
        setIsLaptop(true);
        return;
      }
      
      const newIsLaptop = windowWidth >= LAPTOP_BREAKPOINT && windowWidth <= 1920;
      console.log('Laptop check:', { windowWidth, isLaptop: newIsLaptop });
      setIsLaptop(newIsLaptop);
    };
    
    checkLaptop();
    
    const handleResize = () => {
      checkLaptop();
    };
    
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isLaptop;
}

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const windowWidth = window.innerWidth;
      const screenWidth = window.screen.width;
      
      // Don't consider laptop screens as desktop
      if (screenWidth >= 1280 && screenWidth <= 1920) {
        return false;
      }
      
      return windowWidth > 1920;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDesktop = () => {
      const windowWidth = window.innerWidth;
      const screenWidth = window.screen.width;
      
      // Don't consider laptop screens as desktop
      if (screenWidth >= 1280 && screenWidth <= 1920) {
        setIsDesktop(false);
        return;
      }
      
      const newIsDesktop = windowWidth > 1920;
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
  const isLaptop = useIsLaptop();
  const isDesktop = useIsDesktop();
  
  return {
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isLaptopOrLarger: isLaptop || isDesktop,
    isTabletOrLarger: isTablet || isLaptop || isDesktop
  };
}
