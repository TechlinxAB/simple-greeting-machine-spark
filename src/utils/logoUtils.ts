import { supabase } from "@/lib/supabase";

/**
 * The default logo path that exists in the project 
 */
export const DEFAULT_LOGO_PATH = "/favicon.ico";

/**
 * Name of the logo bucket in Supabase storage
 */
export const LOGO_BUCKET = "app-logo";

/**
 * Standard name for the app logo file
 */
export const LOGO_FILENAME = "app-logo";

/**
 * Maximum dimensions for the logo (in pixels)
 */
export const MAX_LOGO_WIDTH = 400;
export const MAX_LOGO_HEIGHT = 100;

/**
 * Maximum file size for logo (in bytes) - 1MB
 */
export const MAX_LOGO_SIZE = 1048576;

/**
 * Key used for storing logo data URL in localStorage
 */
export const LOGO_DATA_URL_KEY = "app-logo-data-url";

/**
 * Test if an image can be loaded
 */
export function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/**
 * Preloads an image to check if it can be displayed
 */
export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(true);
    };
    
    img.onerror = (error) => {
      console.error("Failed to preload image:", url);
      resolve(false);
    };
    
    // Add cache-busting parameter
    img.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  });
}

/**
 * Gets the public URL for the logo
 */
export function getAppLogoUrl(): string | null {
  try {
    // Get the list of files in the logo bucket
    return supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(`${LOGO_FILENAME}.png`).data.publicUrl;
  } catch (error) {
    console.error("Error getting logo URL:", error);
    return null;
  }
}

/**
 * Gets the logo for display, handling preloading and fallbacks
 */
export async function getLogoForDisplay(): Promise<string> {
  try {
    // First, check local storage for cached data URL
    const cachedDataUrl = localStorage.getItem(LOGO_DATA_URL_KEY);
    if (cachedDataUrl) {
      return cachedDataUrl;
    }
    
    // If no cached data, fetch from storage
    console.log("Fetching logo list from storage");
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    if (error || !data || data.length === 0) {
      return DEFAULT_LOGO_PATH;
    }
    
    // Get the first logo file
    const logoFile = data[0];
    const logoUrl = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(logoFile.name).data.publicUrl;
    
    console.log("Logo URL constructed:", logoUrl);
    
    // Try to preload the image to check if it's accessible
    const canLoad = await preloadImage(logoUrl);
    
    if (!canLoad) {
      console.log("Logo exists but failed to preload, using default");
      return DEFAULT_LOGO_PATH;
    }
    
    // If we found a logo and it loads, download it and create a data URL
    const dataUrl = await getStoredLogoAsDataUrl();
    if (dataUrl) {
      // Cache the data URL in localStorage for better performance
      localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
      return dataUrl;
    }
    
    return DEFAULT_LOGO_PATH;
  } catch (error) {
    console.error("Error in getLogoForDisplay:", error);
    return DEFAULT_LOGO_PATH;
  }
}

/**
 * Ensures the app-logo bucket exists in storage
 */
export async function ensureLogoBucketExists(): Promise<void> {
  try {
    // Check if bucket exists by trying to list its contents
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    if (!error) {
      // Bucket exists, no need to create it
      return;
    }
    
    // Bucket doesn't exist or there was an error listing
    console.log(`Creating ${LOGO_BUCKET} bucket in storage`);
    
    // Create the bucket
    const { error: createError } = await supabase.storage.createBucket(LOGO_BUCKET, { 
      public: true
    });
    
    if (createError) {
      console.error(`Error creating ${LOGO_BUCKET} bucket:`, createError);
      throw createError;
    }
    
    console.log(`${LOGO_BUCKET} bucket created successfully`);
  } catch (error) {
    console.error(`Error ensuring ${LOGO_BUCKET} bucket exists:`, error);
  }
}

/**
 * Validates if a file is acceptable as a logo
 */
export function validateLogoFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_LOGO_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds the ${MAX_LOGO_SIZE / 1024 / 1024}MB limit` 
    };
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or SVG image'
    };
  }

  return { valid: true };
}

/**
 * Resizes an image if needed
 */
export function resizeLogoIfNeeded(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // For SVG, no need to resize
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Check if resizing is needed
      if (img.width <= MAX_LOGO_WIDTH && img.height <= MAX_LOGO_HEIGHT) {
        console.log("No resizing needed, dimensions are within limits");
        resolve(file);
        return;
      }
      
      // Calculate new dimensions while maintaining aspect ratio
      let newWidth = img.width;
      let newHeight = img.height;
      
      if (newWidth > MAX_LOGO_WIDTH) {
        newHeight = (newHeight * MAX_LOGO_WIDTH) / newWidth;
        newWidth = MAX_LOGO_WIDTH;
      }
      
      if (newHeight > MAX_LOGO_HEIGHT) {
        newWidth = (newWidth * MAX_LOGO_HEIGHT) / newHeight;
        newHeight = MAX_LOGO_HEIGHT;
      }
      
      // Round dimensions to avoid floating point issues
      newWidth = Math.floor(newWidth);
      newHeight = Math.floor(newHeight);
      
      console.log(`Image resized from ${img.width}x${img.height} to ${newWidth}x${newHeight}`);
      
      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw and resize image on canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context for resizing'));
        return;
      }
      
      // Use better quality settings for the resize
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create resized image'));
            return;
          }
          resolve(blob);
        },
        file.type,
        0.92 // High quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resizing'));
    };
    
    img.src = url;
  });
}

/**
 * Creates a data URL from a file
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Removes all logos from the app-logo bucket
 */
export async function removeAppLogo(): Promise<boolean> {
  try {
    console.log("Removing all logos from bucket");
    
    // List all files in the app-logo bucket
    const { data, error: listError } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    if (listError) {
      console.error("Error listing app logo files:", listError);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log("No logos to remove");
      return true;
    }
    
    // Delete all files in the bucket
    const { error: deleteError } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove(data.map(file => file.name));
      
    if (deleteError) {
      console.error("Error removing app logo:", deleteError);
      return false;
    }
    
    // Also clear the cached data URL
    localStorage.removeItem(LOGO_DATA_URL_KEY);
    
    // Update the system_settings table to remove the logo
    const { error: settingsError } = await supabase
      .from("system_settings")
      .update({
        settings: { logoUrl: null }
      })
      .eq("id", "app_settings");
      
    if (settingsError) {
      console.error("Error updating system settings after logo removal:", settingsError);
    }
    
    console.log("Logo(s) removed successfully");
    return true;
  } catch (error) {
    console.error("Unexpected error removing app logo:", error);
    return false;
  }
}

/**
 * Uploads a logo to Supabase storage
 */
export async function uploadAppLogo(file: File): Promise<{ dataUrl: string; success: boolean }> {
  try {
    // First validate the file
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Resize the logo if needed
    const resizedBlob = await resizeLogoIfNeeded(file);
    
    // Create a data URL as a fallback
    const dataUrl = await fileToDataUrl(resizedBlob);
    
    // First remove any existing logos
    await removeAppLogo();
    
    // Ensure the bucket exists
    await ensureLogoBucketExists();
    
    // Create a filename with extension
    const fileExt = file.name.split('.').pop();
    const filePath = `${LOGO_FILENAME}.${fileExt}`;
    
    console.log(`Uploading logo as ${filePath}`);
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, resizedBlob, {
        cacheControl: "no-cache",
        upsert: true
      });
      
    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      // Return the data URL as a fallback - this is an important change
      return { dataUrl, success: false };
    }
    
    // Cache the dataUrl in localStorage
    localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
    
    // Also update the system_settings table
    const logoUrl = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath).data.publicUrl;
    
    const { error: settingsError } = await supabase
      .from("system_settings")
      .update({
        settings: { logoUrl: dataUrl }
      })
      .eq("id", "app_settings");
      
    if (settingsError) {
      console.error("Error updating system settings with logo:", settingsError);
    } else {
      console.log("Logo uploaded successfully, public URL:", logoUrl);
    }
    
    // We'll return the dataUrl as the success path - this is key to fix the issues
    return { dataUrl, success: true };
  } catch (error) {
    console.error("Error in uploadAppLogo:", error);
    throw error;
  }
}

/**
 * Gets the stored logo as a data URL
 */
export async function getStoredLogoAsDataUrl(): Promise<string | null> {
  try {
    // First check localStorage for cached version
    const cachedDataUrl = localStorage.getItem(LOGO_DATA_URL_KEY);
    if (cachedDataUrl) {
      return cachedDataUrl;
    }
    
    // Try to get from database settings first
    const { data: settingsData, error: settingsError } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", "app_settings")
      .single();
      
    // If we have settings data with a logoUrl (which is a dataUrl), use that
    if (!settingsError && settingsData?.settings && typeof settingsData.settings === 'object') {
      const settings = settingsData.settings as Record<string, any>;
      if (settings.logoUrl) {
        const dataUrl = settings.logoUrl;
        // Cache it
        localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
        return dataUrl;
      }
    }
    
    // If no value in settings, try to download from storage
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Download the first file
    const logoFile = data[0];
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .download(logoFile.name);
      
    if (downloadError || !fileData) {
      return null;
    }
    
    // Convert to data URL
    const dataUrl = await fileToDataUrl(fileData);
    
    // Cache it for future use
    localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
    
    return dataUrl;
  } catch (error) {
    console.error("Error getting stored logo:", error);
    return null;
  }
}

/**
 * Checks if a logo exists in storage
 */
export async function checkLogoExists(): Promise<boolean> {
  try {
    // Check local storage first
    if (localStorage.getItem(LOGO_DATA_URL_KEY)) {
      return true;
    }
    
    // Next, check system settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("system_settings")
      .select("settings")
      .eq("id", "app_settings")
      .single();
      
    if (!settingsError && settingsData?.settings?.logoUrl) {
      return true;
    }
    
    // Finally, check storage bucket
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Updates logo in the system settings
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
    
    // Cache in localStorage too
    localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
    return true;
  } catch (error) {
    console.error("Error in updateLogoInSystemSettings:", error);
    return false;
  }
}

/**
 * Refreshes the logo in localStorage and across the application
 */
export function refreshLogoDataUrl(dataUrl: string | null): void {
  if (dataUrl) {
    localStorage.setItem(LOGO_DATA_URL_KEY, dataUrl);
  } else {
    localStorage.removeItem(LOGO_DATA_URL_KEY);
  }
}
