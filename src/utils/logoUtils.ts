
import { supabase } from "@/lib/supabase";

/**
 * The URL of the Supabase project
 */
const STORAGE_URL = "https://xojrleypudfrbmvejpow.supabase.co/storage/v1/object/public";

/**
 * Default logo path that exists in the project 
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
 * Get the public URL for the app logo from Supabase storage
 * @returns The URL of the logo or null if it doesn't exist
 */
export async function getAppLogoUrl(): Promise<string | null> {
  try {
    console.log("Fetching logo list from storage");
    
    // List files in the app-logo bucket
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    if (error) {
      console.error("Error listing app logo files:", error);
      return null;
    }
    
    // If no files, return null
    if (!data || data.length === 0) {
      console.log("No logo files found in bucket");
      return null;
    }
    
    // Get the first file (should be the only one)
    const logoFile = data[0];
    
    // Construct the direct URL (bypassing any Supabase client issues)
    const directUrl = `${STORAGE_URL}/${LOGO_BUCKET}/${logoFile.name}`;
    console.log("Logo URL constructed:", directUrl);
    
    return directUrl;
  } catch (error) {
    console.error("Unexpected error fetching app logo:", error);
    return null;
  }
}

/**
 * Check if a logo exists in the app-logo bucket
 * @returns Promise resolving to true if a logo exists, false otherwise
 */
export async function checkLogoExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .list();
      
    if (error) {
      console.error("Error checking if logo exists:", error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error("Unexpected error checking logo existence:", error);
    return false;
  }
}

/**
 * Checks if the file size is within limits
 * @param file The file to check
 * @returns True if the file is valid, false otherwise
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
 * Resizes an image if necessary before upload
 * @param file The image file to resize
 * @returns A promise resolving to the resized file
 */
export function resizeLogoIfNeeded(file: File): Promise<File> {
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
        resolve(file); // No need to resize
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
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create resized image'));
            return;
          }
          
          // Create new file from the blob
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          
          resolve(resizedFile);
        },
        file.type,
        0.9 // Quality
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
 * Uploads a logo to the app-logo bucket, ensuring only one logo exists
 * @param file The logo file to upload
 * @returns The public URL of the uploaded logo or null if upload failed
 */
export async function uploadAppLogo(file: File): Promise<string | null> {
  try {
    // First validate the file
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      console.error("Logo validation failed:", validation.error);
      throw new Error(validation.error);
    }
    
    // Resize the logo if needed
    const resizedFile = await resizeLogoIfNeeded(file);
    
    // First remove any existing logos
    await removeAppLogo();
    
    // We'll standardize the filename but keep the original extension
    const fileExt = file.name.split('.').pop();
    const filePath = `${LOGO_FILENAME}.${fileExt}`;
    
    console.log(`Uploading logo as ${filePath}`);
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, resizedFile, {
        cacheControl: "3600",
        upsert: true, // Replace any existing file
        contentType: file.type,
      });
      
    if (uploadError) {
      console.error("Error uploading logo:", uploadError);
      return null;
    }
    
    // Get the public URL directly rather than constructing it
    const { data: publicUrlData } = await supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath);
      
    console.log("Logo uploaded successfully, public URL:", publicUrlData.publicUrl);
    
    // Return the public URL with a cache-busting parameter
    return `${publicUrlData.publicUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Unexpected error uploading logo:", error);
    return null;
  }
}

/**
 * Removes all logos from the app-logo bucket
 * @returns Promise resolving to true if removal was successful, false otherwise
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
      // No logo to remove
      console.log("No logos to remove");
      return true;
    }
    
    // Delete all files in the bucket (should only be one)
    const { error: deleteError } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove(data.map(file => file.name));
      
    if (deleteError) {
      console.error("Error removing app logo:", deleteError);
      return false;
    }
    
    console.log("Logo(s) removed successfully");
    return true;
  } catch (error) {
    console.error("Unexpected error removing app logo:", error);
    return false;
  }
}

/**
 * Preloads an image to check if it can be loaded successfully
 * @param url The URL of the image to preload
 * @returns Promise resolving to true if image loads, false otherwise
 */
export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      resolve(true);
    };
    
    img.onerror = () => {
      console.error(`Failed to preload image: ${url}`);
      resolve(false);
    };
    
    // Add cache-busting and timestamp
    img.src = `${url}?t=${Date.now()}`;
  });
}
