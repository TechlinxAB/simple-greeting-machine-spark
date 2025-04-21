/**
 * Environment setup utilities
 * 
 * These functions help manage the dynamic selection of Supabase backend environments
 */
import { supabase } from "./supabase";
import { environment } from "@/config/environment";
import { toast } from "sonner";

/**
 * Apply custom Supabase connection settings if available in localStorage
 */
export function initializeCustomEnvironment() {
  try {
    const customUrl = localStorage.getItem("custom_supabase_url");
    const customAnonKey = localStorage.getItem("custom_supabase_anon_key");
    
    // If custom settings exist, apply them
    if (customUrl && customAnonKey) {
      console.log("Using custom Supabase environment:", customUrl);
      return {
        url: customUrl,
        anonKey: customAnonKey,
        isCustom: true
      };
    }
    
    // Otherwise use default environment settings
    return {
      url: environment.supabase.url,
      anonKey: environment.supabase.anonKey,
      isCustom: false
    };
  } catch (error) {
    console.error("Error loading custom environment:", error);
    toast.error("Failed to load custom Supabase settings, using defaults");
    
    return {
      url: environment.supabase.url,
      anonKey: environment.supabase.anonKey,
      isCustom: false
    };
  }
}

/**
 * Test connection to the Supabase backend
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  try {
    // Create a temporary Supabase client with the provided URL and key
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient(url, anonKey);
    
    // Try a simple query to check connection
    const { error } = await tempClient.from('system_settings').select('id').limit(1);
    
    if (error) {
      console.error("Connection test failed:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Connection test error:", err);
    return false;
  }
}

/**
 * Save custom Supabase connection settings to localStorage
 */
export function saveCustomEnvironment(url: string, anonKey: string): void {
  try {
    localStorage.setItem("custom_supabase_url", url);
    localStorage.setItem("custom_supabase_anon_key", anonKey);
  } catch (error) {
    console.error("Error saving custom environment:", error);
    toast.error("Failed to save custom Supabase settings");
  }
}

/**
 * Reset to default Supabase connection settings
 */
export function resetToDefaultEnvironment(): void {
  try {
    localStorage.removeItem("custom_supabase_url");
    localStorage.removeItem("custom_supabase_anon_key");
    toast.success("Reset to default Supabase environment. Reloading...");
    
    // Give toast time to display
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("Error resetting environment:", error);
    toast.error("Failed to reset Supabase settings");
  }
}

/**
 * Force reload of the app and Supabase client after environment config changes
 */
export function reloadSupabaseEnvironment() {
  // Reload the page, which will cause all config to be re-read—in effect, linking the frontend to the chosen Supabase instance
  window.location.reload();
}
