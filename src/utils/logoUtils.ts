
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export const LOGO_DATA_URL_KEY = "appLogoDataUrl";
export const DEFAULT_LOGO_PATH = "/logo.png";
export const MAX_LOGO_WIDTH = 512;
export const MAX_LOGO_HEIGHT = 512;
export const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

// The bucket name we're using for logos
export const LOGO_BUCKET_NAME = "app-assets";
export const LOGO_FOLDER_PATH = "logos";

/**
 * Ensures the app-assets bucket exists
 * @returns Promise with boolean indicating success
 */
export async function ensureLogoBucketExists(): Promise<boolean> {
  try {
    // Check if bucket exists
    const { data: existingBuckets } = await supabase
      .storage
      .listBuckets();
      
    const bucketExists = existingBuckets?.some(bucket => bucket.name === LOGO_BUCKET_NAME);
    
    if (bucketExists) {
      return true;
    } else {
      console.error(`No ${LOGO_BUCKET_NAME} bucket exists. The bucket needs to be created in Supabase.`);
      return false;
    }
  } catch (error) {
    console.error("Failed to ensure bucket exists", error);
    return false;
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
      .from(LOGO_BUCKET_NAME)
      .list(LOGO_FOLDER_PATH, {
        search: 'logo',
        limit: 1,
      });
      
    if (error) {
      console.error("Error checking logo exists:", error);
      return false;
    }
    
    return data && data.length > 0;
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
    // First ensure storage bucket exists
    const bucketExists = await ensureLogoBucketExists();
    if (!bucketExists) {
      console.error("Logo bucket doesn't exist and couldn't be created");
      return { dataUrl: '', success: false };
    }
    
    // Delete any existing logos first to avoid accumulation
    await removeAppLogo();
    
    const fileExt = file.name.split('.').pop();
    const filePath = `${LOGO_FOLDER_PATH}/logo-${uuidv4()}.${fileExt}`;
    
    const { data, error } = await supabase
      .storage
      .from(LOGO_BUCKET_NAME)
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
      .from(LOGO_BUCKET_NAME)
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
      .from(LOGO_BUCKET_NAME)
      .list(LOGO_FOLDER_PATH, {
        search: 'logo',
        limit: 10, // Increased to catch multiple potential logo files
      });
      
    if (listError) {
      console.error("Error listing logos:", listError);
      return false;
    }
    
    if (!listData || listData.length === 0) {
      console.log("No logo found to remove");
      return true;
    }
    
    const filesToRemove = listData.map(file => `${LOGO_FOLDER_PATH}/${file.name}`);
    
    const { error } = await supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .remove(filesToRemove);
      
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
    // First, get current settings to preserve other values
    const { data, error: fetchError } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", "app_settings")
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error fetching current settings:", fetchError);
      return false;
    }
    
    // Prepare the settings object
    const currentSettings = data?.settings || {};
    const updatedSettings: Record<string, any> = {};
    
    // Copy all properties from current settings
    if (typeof currentSettings === 'object') {
      Object.assign(updatedSettings, currentSettings);
    }
    
    // Add or update the logoUrl property
    updatedSettings.logoUrl = dataUrl;
    
    // Update or insert the settings
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        id: "app_settings",
        settings: updatedSettings
      });
      
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
