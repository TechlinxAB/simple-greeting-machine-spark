
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AppSettings {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  accentColor: string;
  logoUrl?: string;
}

// Default color theme using the green palette from the provided screenshot
export const DEFAULT_THEME: AppSettings = {
  appName: "Techlinx Time Tracker",
  primaryColor: "#4ba64b", // Green primary
  secondaryColor: "#e8f5e9", // Light green
  sidebarColor: "#326c32", // Dark green for sidebar
  accentColor: "#4caf50", // Accent green
  logoUrl: undefined,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  // Fetch app settings from Supabase
  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("settings")
          .eq("id", "app_settings")
          .single();
          
        if (error) throw error;
        
        // Ensure we have a complete settings object with all required properties
        if (data?.settings) {
          const settings = data.settings as Record<string, any>;
          return {
            appName: settings.appName || DEFAULT_THEME.appName,
            primaryColor: settings.primaryColor || DEFAULT_THEME.primaryColor,
            secondaryColor: settings.secondaryColor || DEFAULT_THEME.secondaryColor,
            sidebarColor: settings.sidebarColor || DEFAULT_THEME.sidebarColor,
            accentColor: settings.accentColor || DEFAULT_THEME.accentColor,
          } as AppSettings;
        }
        
        return DEFAULT_THEME;
      } catch (error) {
        console.error("Error fetching app settings:", error);
        return DEFAULT_THEME;
      }
    },
    staleTime: 60000, // 1 minute
  });

  // Apply theme when settings change or on initial load
  useEffect(() => {
    if (appSettings) {
      applyColorTheme(appSettings);
      
      // Set up a realtime subscription to update when settings change
      const channel = supabase
        .channel('system_settings_changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'system_settings',
            filter: 'id=eq.app_settings'
          },
          () => {
            // Invalidate the app-settings query to refetch
            queryClient.invalidateQueries({ queryKey: ["app-settings"] });
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [appSettings, queryClient]);

  return <>{children}</>;
}

export function applyColorTheme(settings: AppSettings) {
  const root = document.documentElement;
  
  // Convert hex to hsl for CSS variables
  const primaryHsl = hexToHSL(settings.primaryColor);
  const secondaryHsl = hexToHSL(settings.secondaryColor);
  const sidebarHsl = hexToHSL(settings.sidebarColor);
  const accentHsl = hexToHSL(settings.accentColor);
  
  if (primaryHsl) {
    root.style.setProperty('--primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
  }
  
  if (secondaryHsl) {
    root.style.setProperty('--secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
  }
  
  if (sidebarHsl) {
    root.style.setProperty('--sidebar-background', `${sidebarHsl.h} ${sidebarHsl.s}% ${sidebarHsl.l}%`);
    // Darker variant for sidebar accent (footer, etc)
    root.style.setProperty('--sidebar-accent', `${sidebarHsl.h} ${sidebarHsl.s}% ${Math.max(sidebarHsl.l - 10, 5)}%`);
    // Lighter for active items
    root.style.setProperty('--sidebar-primary', `${sidebarHsl.h} ${sidebarHsl.s}% ${Math.min(sidebarHsl.l + 10, 95)}%`);
  }
  
  if (accentHsl) {
    root.style.setProperty('--accent', `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
  }
  
  // Store the name in localStorage for persistence
  localStorage.setItem("appName", settings.appName);
  
  // Update document title
  document.title = settings.appName;
}

// Helper function to convert hex color to HSL
function hexToHSL(hex: string) {
  // Remove the # if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex value
  let r, g, b;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16) / 255;
    g = parseInt(hex[1] + hex[1], 16) / 255;
    b = parseInt(hex[2] + hex[2], 16) / 255;
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16) / 255;
    g = parseInt(hex.substring(2, 4), 16) / 255;
    b = parseInt(hex.substring(4, 6), 16) / 255;
  } else {
    return null; // Invalid hex
  }
  
  // Find min and max channel values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h = Math.round(h * 60);
  }
  
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return { h, s, l };
}
