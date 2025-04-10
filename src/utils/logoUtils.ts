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
 * Uploads a logo to the app-logo bucket, ensuring only one logo exists
 * @param file The logo file to upload
 * @returns The public URL of the uploaded logo or null if upload failed
 */
export async function uploadAppLogo(file: File): Promise<string | null> {
  try {
    // First remove any existing logos
    await removeAppLogo();
    
    // We'll standardize the filename but keep the original extension
    const fileExt = file.name.split('.').pop();
    const filePath = `${LOGO_FILENAME}.${fileExt}`;
    
    console.log(`Uploading logo as ${filePath}`);
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, file, {
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
