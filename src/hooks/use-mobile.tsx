
import * as React from "react";

export const MOBILE_BREAKPOINT = 640;
export const TABLET_BREAKPOINT = 1024;
export const LAPTOP_BREAKPOINT = 1366;

// Function to detect zoom level
const getZoomLevel = () => {
  if (typeof window === 'undefined') return 1;
  
  // Calculate zoom using devicePixelRatio and window dimensions
  const devicePixelRatio = window.devicePixelRatio || 1;
  const screenWidth = window.screen.width;
  const windowWidth = window.innerWidth;
  
  // Estimate zoom level (this is an approximation)
  const estimatedZoom = (screenWidth / windowWidth) * devicePixelRatio;
  return estimatedZoom;
};

// Function to get effective viewport width considering zoom
const getEffectiveViewportWidth = () => {
  if (typeof window === 'undefined') return 0;
  
  const zoomLevel = getZoomLevel();
  const actualWidth = window.innerWidth;
  
  // If zoom is greater than 110%, treat the effective width as smaller
  if (zoomLevel > 1.1) {
    return actualWidth / zoomLevel;
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
      return effectiveWidth >= MOBILE_BREAKPOINT && effectiveWidth < TABLET_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTablet = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const newIsTablet = effectiveWidth >= MOBILE_BREAKPOINT && effectiveWidth < TABLET_BREAKPOINT;
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
      return effectiveWidth >= TABLET_BREAKPOINT && effectiveWidth <= LAPTOP_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLaptop = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const newIsLaptop = effectiveWidth >= TABLET_BREAKPOINT && effectiveWidth <= LAPTOP_BREAKPOINT;
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
      return effectiveWidth > LAPTOP_BREAKPOINT;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDesktop = () => {
      const effectiveWidth = getEffectiveViewportWidth();
      const newIsDesktop = effectiveWidth > LAPTOP_BREAKPOINT;
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
