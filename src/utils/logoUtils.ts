
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
export const MAX_LOGO_WIDTH = 600; // Increased for wider logos
export const MAX_LOGO_HEIGHT = 150; // Increased height as well

/**
 * Maximum file size for logo (in bytes) - 2MB
 */
export const MAX_LOGO_SIZE = 2097152; // Increased to 2MB

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
    
    // Construct the direct URL
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
 * Checks if the file size and type are within limits
 * @param file The file to check
 * @returns Object with validation result and optional error message
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
      
      // Log original dimensions
      console.log(`Original image dimensions: ${img.width}x${img.height}`);
      
      // Check if resizing is needed
      if (img.width <= MAX_LOGO_WIDTH && img.height <= MAX_LOGO_HEIGHT) {
        console.log("No resizing needed, dimensions are within limits");
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
      
      // Clear canvas before drawing
      ctx.clearRect(0, 0, newWidth, newHeight);
      
      // Fill with white background for images with transparency
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, newWidth, newHeight);
      
      // Draw the image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert canvas to blob with higher quality (0.95)
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
        0.95 // High quality
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
 * @param file The file to convert
 * @returns Promise resolving to a data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
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
    
    // Upload the file with better cache control and cache-busting
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
    
    // Force a small delay to allow the storage system to process the file
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get the public URL directly
    const { data: publicUrlData } = await supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(filePath);
      
    if (!publicUrlData) {
      console.error("Failed to get public URL for uploaded logo");
      return null;
    }
    
    // Add a cache-busting parameter to the URL
    const timestamp = Date.now();
    const publicUrlWithCacheBust = `${publicUrlData.publicUrl}?t=${timestamp}`;
    
    console.log("Logo uploaded successfully, public URL:", publicUrlWithCacheBust);
    
    // Before returning, let's verify the image can be loaded
    try {
      // Convert the uploaded file to a data URL as a fallback
      const dataUrl = await fileToDataUrl(resizedFile);
      
      // Test if the image can be loaded from the public URL
      const canLoadPublicUrl = await testImageLoad(publicUrlWithCacheBust);
      
      if (!canLoadPublicUrl) {
        console.log("Public URL can't be loaded directly, using data URL for preloading verification");
        
        // If we can't load from public URL, but we have a valid data URL,
        // we can still return the public URL and client-side code will handle fallback
        if (dataUrl && dataUrl.startsWith('data:image/')) {
          return publicUrlWithCacheBust;
        }
        
        throw new Error("Cannot verify the uploaded image can be displayed");
      }
      
      return publicUrlWithCacheBust;
    } catch (preloadError) {
      console.error("Error verifying image can be loaded:", preloadError);
      throw new Error("Logo uploaded but cannot be verified for display");
    }
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
 * Tests if an image can be loaded from a URL
 * @param url The URL to test
 * @returns Promise resolving to true if the image can be loaded, false otherwise
 */
export function testImageLoad(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Set a timeout to prevent hanging on problematic images
    const timeout = setTimeout(() => {
      console.warn(`Image load test timed out for: ${url}`);
      resolve(false);
    }, 5000); // 5 second timeout
    
    const img = new Image();
    
    img.onload = () => {
      clearTimeout(timeout);
      console.log(`Test image loaded successfully: ${url} (${img.width}x${img.height})`);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      console.error(`Failed to load test image: ${url}`);
      resolve(false);
    };
    
    // Add cache-busting and set attributes to prioritize loading
    img.src = url;
    img.setAttribute('importance', 'high');
    img.setAttribute('fetchpriority', 'high');
    img.crossOrigin = 'anonymous'; // Try with CORS enabled
  });
}

/**
 * Preloads an image to check if it can be loaded successfully
 * Uses a more robust method with timeout and retries
 * @param url The URL of the image to preload
 * @returns Promise resolving to true if image loads, false otherwise
 */
export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    const attemptLoad = () => {
      attempts++;
      
      // Set a timeout to prevent hanging on problematic images
      const timeout = setTimeout(() => {
        console.warn(`Image preload timed out for: ${url} (attempt ${attempts}/${maxAttempts})`);
        if (attempts < maxAttempts) {
          console.log(`Retrying preload for: ${url}`);
          attemptLoad();
        } else {
          console.error(`Max attempts reached, preload failed for: ${url}`);
          resolve(false);
        }
      }, 5000); // 5 second timeout
      
      const img = new Image();
      
      img.onload = () => {
        clearTimeout(timeout);
        console.log(`Image preloaded successfully: ${url} (${img.width}x${img.height})`);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        console.error(`Failed to preload image: ${url} (attempt ${attempts}/${maxAttempts})`);
        
        if (attempts < maxAttempts) {
          console.log(`Retrying preload for: ${url}`);
          setTimeout(attemptLoad, 1000); // Wait 1 second before retry
        } else {
          console.error(`Max attempts reached, preload failed for: ${url}`);
          resolve(false);
        }
      };
      
      // Add cache-busting for each attempt
      const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}&attempt=${attempts}`;
      img.src = cacheBustUrl;
      
      // Prioritize loading
      img.setAttribute('importance', 'high');
      img.setAttribute('fetchpriority', 'high');
      img.crossOrigin = 'anonymous'; // Try with CORS enabled
    };
    
    attemptLoad();
  });
}

/**
 * Gets a logo suitable for display, with validation and error handling
 * @returns Promise resolving to the logo URL or default logo path
 */
export async function getLogoForDisplay(): Promise<string> {
  try {
    const logoUrl = await getAppLogoUrl();
    
    if (!logoUrl) {
      return DEFAULT_LOGO_PATH;
    }
    
    // Try to preload the image to verify it exists and can be displayed
    const loadSuccessful = await preloadImage(logoUrl);
    if (!loadSuccessful) {
      console.warn("Logo exists but failed to preload, using default");
      return DEFAULT_LOGO_PATH;
    }
    
    return `${logoUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Error getting logo for display:", error);
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
    
    // Use admin API to create bucket (this will only work with service_role key)
    const { error: createError } = await supabase.storage.createBucket(LOGO_BUCKET, { 
      public: true,
      fileSizeLimit: MAX_LOGO_SIZE,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
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
