
import * as React from "react";

export const MOBILE_BREAKPOINT = 640;
export const TABLET_BREAKPOINT = 1024;
export const LAPTOP_BREAKPOINT = 1280; // Lowered from 1366 to better accommodate 13" laptops

// Function to detect zoom level
const getZoomLevel = () => {
  if (typeof window === 'undefined') return 1;
  
  // More accurate zoom detection
  const devicePixelRatio = window.devicePixelRatio || 1;
  const screenWidth = window.screen.width;
  const windowWidth = window.innerWidth;
  
  // Calculate zoom more accurately
  const zoom = (screenWidth / windowWidth) * devicePixelRatio;
  
  // At exactly 100% zoom, this should be very close to 1
  // Only consider it "zoomed" if it's meaningfully above 1.2
  return zoom;
};

// Function to get effective viewport width considering zoom
const getEffectiveViewportWidth = () => {
  if (typeof window === 'undefined') return 0;
  
  const zoomLevel = getZoomLevel();
  const actualWidth = window.innerWidth;
  const screenWidth = window.screen.width;
  
  // Debug logging (remove after testing)
  console.log('Zoom detection:', {
    zoomLevel: zoomLevel.toFixed(2),
    actualWidth,
    screenWidth,
    devicePixelRatio: window.devicePixelRatio
  });
  
  // If we're on a laptop-sized screen (>= 1280px physical) at close to 100% zoom, 
  // always return the actual width (no zoom compensation)
  if (screenWidth >= 1280 && zoomLevel <= 1.25) {
    console.log('Laptop detected at ~100% zoom, using actual width');
    return actualWidth;
  }
  
  // Only apply zoom compensation if zoom is significantly above 125%
  if (zoomLevel > 1.25) {
    console.log('High zoom detected, applying compensation');
    return actualWidth / (zoomLevel * 0.7); // Stronger compensation factor
  }
  
  return actualWidth;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return getEffectiveViewportWidth() < MOBILE_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkMobile = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const newIsMobile = effectiveWidth < MOBILE_BREAKPOINT;
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
      const effectiveWidth = getEffectiveViewportWidth();
      const screenWidth = window.screen.width;
      
      // Never consider laptop-sized screens as tablets at 100% zoom
      if (screenWidth >= 1280 && getZoomLevel() <= 1.25) {
        return false;
      }
      
      return effectiveWidth >= MOBILE_BREAKPOINT && effectiveWidth < LAPTOP_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTablet = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const screenWidth = window.screen.width;
      
      // Never consider laptop-sized screens as tablets at 100% zoom
      if (screenWidth >= 1280 && getZoomLevel() <= 1.25) {
        setIsTablet(false);
        return;
      }
      
      const newIsTablet = effectiveWidth >= MOBILE_BREAKPOINT && effectiveWidth < LAPTOP_BREAKPOINT;
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
      const effectiveWidth = getEffectiveViewportWidth();
      const screenWidth = window.screen.width;
      
      // Always consider laptop-sized screens as laptops at 100% zoom
      if (screenWidth >= 1280 && getZoomLevel() <= 1.25) {
        return true;
      }
      
      return effectiveWidth >= LAPTOP_BREAKPOINT && effectiveWidth <= 1920;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLaptop = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const screenWidth = window.screen.width;
      
      // Always consider laptop-sized screens as laptops at 100% zoom
      if (screenWidth >= 1280 && getZoomLevel() <= 1.25) {
        setIsLaptop(true);
        return;
      }
      
      const newIsLaptop = effectiveWidth >= LAPTOP_BREAKPOINT && effectiveWidth <= 1920;
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
      const effectiveWidth = getEffectiveViewportWidth();
      const screenWidth = window.screen.width;
      
      // Don't consider laptop screens as desktop at 100% zoom
      if (screenWidth >= 1280 && screenWidth <= 1920 && getZoomLevel() <= 1.25) {
        return false;
      }
      
      return effectiveWidth > 1920;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDesktop = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const screenWidth = window.screen.width;
      
      // Don't consider laptop screens as desktop at 100% zoom
      if (screenWidth >= 1280 && screenWidth <= 1920 && getZoomLevel() <= 1.25) {
        setIsDesktop(false);
        return;
      }
      
      const newIsDesktop = effectiveWidth > 1920;
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
