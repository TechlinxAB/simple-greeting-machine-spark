import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from 'uuid';

export const LOGO_DATA_URL_KEY = "appLogoDataUrl";
export const DEFAULT_LOGO_PATH = "/logo.png";
export const MAX_LOGO_WIDTH = 512;
export const MAX_LOGO_HEIGHT = 512;
export const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

// The bucket name we're using for logos
export const LOGO_BUCKET_NAME = "application-logo";
export const LOGO_FOLDER_PATH = "logos";

/**
 * Ensure the logo bucket exists before any operations - we now assume it exists
 * since we've created it via SQL migration
 */
export async function ensureLogoBucketExists(): Promise<boolean> {
  // We've created the bucket via SQL migration, so we can assume it exists
  return true;
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
      .list(LOGO_FOLDER_PATH);
      
    if (error) {
      console.error("Error checking logo exists:", error);
      return false;
    }
    
    return data && data.length > 0 && data.some(file => file.name.includes('logo'));
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
    console.log("Starting logo upload process");
    
    // Delete any existing logos first to avoid accumulation
    await removeAppLogo();
    
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${uuidv4()}.${fileExt}`;
    const filePath = `${LOGO_FOLDER_PATH}/${fileName}`;
    
    console.log(`Uploading file to ${filePath}`);
    
    // Try uploading the file
    const { data, error } = await supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) {
      console.error("Error uploading logo:", error);
      
      // Try local storage as fallback
      const fileDataUrl = await fileToDataUrl(file);
      if (fileDataUrl) {
        localStorage.setItem(LOGO_DATA_URL_KEY, fileDataUrl);
        return { dataUrl: fileDataUrl, success: false };
      }
      
      return { dataUrl: '', success: false };
    }
    
    console.log("Logo upload successful, getting public URL");
    
    // Get the public URL
    const { data: publicUrl } = supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .getPublicUrl(filePath);
      
    if (!publicUrl?.publicUrl) {
      console.error("Error getting public logo URL");
      
      // Try local storage as fallback
      const fileDataUrl = await fileToDataUrl(file);
      if (fileDataUrl) {
        localStorage.setItem(LOGO_DATA_URL_KEY, fileDataUrl);
        return { dataUrl: fileDataUrl, success: false };
      }
      
      return { dataUrl: '', success: false };
    }
    
    const dataUrl = publicUrl.publicUrl;
    console.log("Public URL obtained:", dataUrl);
    
    // Store in localStorage for quick access
    localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
    
    // Update the logo in system settings
    await updateLogoInSystemSettings(dataUrl);
    
    return { dataUrl, success: true };
  } catch (error) {
    console.error("Error uploading logo:", error);
    
    // Try local storage as fallback
    try {
      const fileDataUrl = await fileToDataUrl(file);
      if (fileDataUrl) {
        localStorage.setItem(LOGO_DATA_URL_KEY, fileDataUrl);
        return { dataUrl: fileDataUrl, success: false };
      }
    } catch (e) {
      console.error("Failed to convert file to data URL:", e);
    }
    
    return { dataUrl: '', success: false };
  }
}

/**
 * Removes the app logo from storage
 * @returns Promise with boolean
 */
export async function removeAppLogo(): Promise<boolean> {
  try {
    // Check if there are any logo files to remove
    const { data: listData, error: listError } = await supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .list(LOGO_FOLDER_PATH);
      
    if (listError) {
      console.error("Error listing logos:", listError);
      return false;
    }
    
    if (!listData || listData.length === 0) {
      console.log("No logo found to remove");
      localStorage.removeItem(LOGO_DATA_URL_KEY);
      return true;
    }
    
    // Filter files that contain "logo" in their name
    const logoFiles = listData.filter(file => file.name.includes('logo'));
    
    if (logoFiles.length === 0) {
      console.log("No logo files found to remove");
      localStorage.removeItem(LOGO_DATA_URL_KEY);
      return true;
    }
    
    const filesToRemove = logoFiles.map(file => `${LOGO_FOLDER_PATH}/${file.name}`);
    console.log("Removing logo files:", filesToRemove);
    
    // Remove all logo files
    const { error } = await supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .remove(filesToRemove);
      
    if (error) {
      console.error("Error removing logo files:", error);
      return false;
    }
    
    // Always clear from localStorage too
    localStorage.removeItem(LOGO_DATA_URL_KEY);
    
    // Also update system settings to remove the logo
    await updateLogoInSystemSettings("");
    
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
    // First try localStorage for performance
    const storedDataUrl = getStoredLogoAsDataUrl();
    if (storedDataUrl) {
      return storedDataUrl;
    }
    
    // Check for logos in the storage bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .list(LOGO_FOLDER_PATH);
    
    if (listError || !files || files.length === 0) {
      console.log("No logo files found in storage, checking system settings");
      
      // Try system settings as fallback
      const { data: settingsData, error: settingsError } = await supabase
        .from("system_settings")
        .select("settings")
        .eq("id", "app_settings")
        .single();
        
      // If we have settings data with a logoUrl, use that
      if (!settingsError && settingsData?.settings) {
        const settings = settingsData.settings as Record<string, any>;
        if (settings && typeof settings === 'object' && settings.logoUrl) {
          const dataUrl = settings.logoUrl;
          // Cache it
          localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
          return dataUrl;
        }
      }
      
      return null;
    }
    
    // Find the first logo file
    const logoFile = files.find(file => file.name.includes('logo'));
    if (!logoFile) {
      console.log("No logo file found in storage");
      return null;
    }
    
    // Get the public URL
    const { data: publicUrl } = supabase
      .storage
      .from(LOGO_BUCKET_NAME)
      .getPublicUrl(`${LOGO_FOLDER_PATH}/${logoFile.name}`);
      
    if (publicUrl?.publicUrl) {
      // Cache it
      localStorage.setItem(LOGO_DATA_URL_KEY, publicUrl.publicUrl);
      return publicUrl.publicUrl;
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
