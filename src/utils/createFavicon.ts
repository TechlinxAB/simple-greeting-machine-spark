
/**
 * Creates a favicon with text on a colored background
 * @param text The text to display on the favicon
 * @param backgroundColor The background color (hex code)
 * @param textColor The text color (hex code)
 * @returns A data URL representing the favicon
 */
export function createFavicon(
  text: string,
  backgroundColor: string = "#326c32",
  textColor: string = "#ffffff"
): string {
  // Create a canvas element
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  
  // Get the 2D context
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  
  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);
  
  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, size / 2);
  
  // Convert to data URL
  return canvas.toDataURL("image/png");
}

/**
 * Sets the favicon for the current page
 * @param faviconUrl URL or data URL of the favicon
 */
export function setFavicon(faviconUrl: string): void {
  // Remove any existing favicon links
  const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
  existingFavicons.forEach(favicon => favicon.remove());
  
  // Create a new favicon link element
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = faviconUrl;
  link.type = "image/png";
  
  // Add it to the document head
  document.head.appendChild(link);
}
