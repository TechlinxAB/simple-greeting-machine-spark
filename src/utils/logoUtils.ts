import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export const LOGO_DATA_URL_KEY = "appLogoDataUrl";
export const DEFAULT_LOGO_PATH = "/logo.png";
export const MAX_LOGO_WIDTH = 512;
export const MAX_LOGO_HEIGHT = 512;
export const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Ensures the logo storage bucket exists
 */
export async function ensureLogoBucketExists() {
  try {
    const { data, error } = await supabase.storage.createBucket('app-logos', {
      public: true,
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('Bucket already exists, skipping creation');
      } else {
        console.error('Error creating bucket:', error);
        throw error;
      }
    } else {
      console.log('Bucket created successfully:', data);
    }
  } catch (err) {
    console.error("Failed to ensure bucket exists", err);
    throw err;
  }
}

/**
 * Checks if a logo exists in storage
 * @returns Promise with boolean
 */
export async function checkLogoExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .storage
      .from('app-logos')
      .list('', {
        search: 'logo',
        limit: 1,
      });
      
    if (error) {
      console.error("Error checking logo exists:", error);
      return false;
    }
    
    return data.length > 0;
  } catch (error) {
    console.error("Error checking logo exists:", error);
    return false;
  }
}

/**
 * Uploads the app logo to storage
 * @param file File to upload
 * @returns Promise with the data URL or null
 */
export async function uploadAppLogo(file: File): Promise<{ dataUrl: string, success: boolean }> {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `logo-${uuidv4()}.${fileExt}`;
    
    const { data, error } = await supabase
      .storage
      .from('app-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      console.error("Error uploading logo:", error);
      return { dataUrl: '', success: false };
    }
    
    const { data: publicUrl } = supabase
      .storage
      .from('app-logos')
      .getPublicUrl(filePath);
      
    if (!publicUrl?.publicUrl) {
      console.error("Error getting public logo URL");
      return { dataUrl: '', success: false };
    }
    
    const dataUrl = publicUrl.publicUrl;
    
    return { dataUrl, success: true };
  } catch (error) {
    console.error("Error uploading logo:", error);
    return { dataUrl: '', success: false };
  }
}

/**
 * Removes the app logo from storage
 * @returns Promise with boolean
 */
export async function removeAppLogo(): Promise<boolean> {
  try {
    const { data: listData, error: listError } = await supabase
      .storage
      .from('app-logos')
      .list('', {
        search: 'logo',
        limit: 1,
      });
      
    if (listError) {
      console.error("Error listing logos:", listError);
      return false;
    }
    
    if (listData.length === 0) {
      console.log("No logo found to remove");
      return true;
    }
    
    const fileToRemove = listData[0].name;
    
    const { error } = await supabase
      .storage
      .from('app-logos')
      .remove([fileToRemove]);
      
    if (error) {
      console.error("Error removing logo:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error removing logo:", error);
    return false;
  }
}

/**
 * Validates the logo file
 * @param file File to validate
 * @returns object with valid boolean and optional error message
 */
export function validateLogoFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_LOGO_SIZE) {
    return { valid: false, error: `File size exceeds the maximum allowed size of ${MAX_LOGO_SIZE / 1024 / 1024}MB` };
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and SVG are allowed.' };
  }
  
  return { valid: true };
}

/**
 * Converts a file to a data URL
 * @param file File to convert
 * @returns Promise with the data URL
 */
export function fileToDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get logo data URL from local storage
 * @returns data URL from local storage or null
 */
export function getStoredLogoAsDataUrl(): string | null {
  return localStorage.getItem(LOGO_DATA_URL_KEY);
}

/**
 * Get logo data URL from system settings or storage
 * @returns Promise with the data URL or null
 */
export async function getSystemLogoDataUrl(): Promise<string | null> {
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", "app_settings")
      .single();
      
    // If we have settings data with a logoUrl (which is a dataUrl), use that
    if (!settingsError && settingsData?.settings) {
      const settings = settingsData.settings as Record<string, any>;
      if (settings && typeof settings === 'object' && settings.logoUrl) {
        const dataUrl = settings.logoUrl;
        // Cache it
        localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
        return dataUrl;
      }
    }
    
    // If not, try to get it from local storage
    const storedDataUrl = getStoredLogoAsDataUrl();
    if (storedDataUrl) {
      return storedDataUrl;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting logo data URL:", error);
    return null;
  }
}

/**
 * Update the logo URL in system settings
 */
export async function updateLogoInSystemSettings(dataUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("system_settings")
      .update({
        settings: { logoUrl: dataUrl }
      })
      .eq("id", "app_settings");
      
    if (error) {
      console.error("Error updating logo in system settings:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating logo in system settings:", error);
    return false;
  }
}
