
import { toast } from "sonner";

interface EnvironmentSettings {
  url: string;
  anonKey: string;
  isCustom: boolean;
}

/**
 * Initialize and return the custom environment settings
 */
export function initializeCustomEnvironment(): EnvironmentSettings {
  const customUrl = localStorage.getItem("custom_supabase_url");
  const customAnonKey = localStorage.getItem("custom_supabase_anon_key");
  const isCustom = Boolean(customUrl && customAnonKey);

  return {
    url: customUrl || "",
    anonKey: customAnonKey || "",
    isCustom
  };
}

/**
 * Test the connection to a Supabase instance
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  if (!url || !anonKey) {
    return false;
  }

  try {
    // Basic validation of URL format
    const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/?$/;
    if (!urlPattern.test(url)) {
      throw new Error('Invalid Supabase URL format. Should be like https://YOUR-project-id.supabase.co');
    }

    // Try to make a basic anonymous request to test the connection
    const response = await fetch(`${url}/rest/v1/?apikey=${anonKey}`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase connection test failed:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error testing Supabase connection:", error);
    return false;
  }
}

/**
 * Save custom environment settings to localStorage
 */
export function saveCustomEnvironment(url: string, anonKey: string): void {
  localStorage.setItem("custom_supabase_url", url);
  localStorage.setItem("custom_supabase_anon_key", anonKey);
}

/**
 * Reset to default environment settings
 */
export function resetToDefaultEnvironment(): void {
  localStorage.removeItem("custom_supabase_url");
  localStorage.removeItem("custom_supabase_anon_key");
}
