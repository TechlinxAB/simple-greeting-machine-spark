
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface NewsImageUploadProps {
  initialImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
}

export function NewsImageUpload({ initialImageUrl, onImageUploaded }: NewsImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { role } = useAuth();
  
  const canUploadImages = role === 'admin' || role === 'manager';

  // Extract filename from URL to use when deleting
  const getFilePathFromUrl = (url: string): string | null => {
    try {
      // The URL format is like: https://[project-ref].supabase.co/storage/v1/object/public/news_images/[filename]
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1]; // Get the last segment which is the filename
    } catch (error) {
      console.error("Error extracting filename from URL:", error);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user has permission
    if (!canUploadImages) {
      toast.error("You don't have permission to upload images");
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large. Maximum size is 5MB.");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Only image files are allowed.");
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique file name to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("Uploading to news_images bucket:", filePath);
      console.log("File type:", file.type);

      // IMPORTANT: Don't convert the file to a Blob, use the raw file directly
      // This is the key difference compared to the previous implementation

      // Upload the image to the news_images bucket
      const { error: uploadError } = await supabase
        .storage
        .from('news_images')
        .upload(filePath, file, {
          contentType: file.type, // Explicitly set the content type
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('news_images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log("Image uploaded successfully, URL:", publicUrl);
      
      setImageUrl(publicUrl);
      onImageUploaded(publicUrl);
      toast.success("Image uploaded successfully");

    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    if (!canUploadImages) {
      toast.error("You don't have permission to remove images");
      return;
    }
    
    // Open confirm dialog instead of immediately removing
    setDeleteDialogOpen(true);
  };

  const confirmImageRemoval = async () => {
    if (!imageUrl) return;
    
    setIsDeleting(true);
    
    try {
      // Extract the filename from the URL
      const filePath = getFilePathFromUrl(imageUrl);
      
      if (filePath) {
        console.log("Deleting file from storage:", filePath);
        
        // Delete the file from storage
        const { error } = await supabase
          .storage
          .from('news_images')
          .remove([filePath]);
          
        if (error) {
          console.error("Error deleting file:", error);
          throw error;
        }
        
        console.log("File deleted successfully");
      }
      
      // Update state and notify parent component
      setImageUrl(null);
      onImageUploaded('');
      toast.success("Image removed successfully");
      
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(error.message || "Failed to remove image");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="image-upload">Featured Image</Label>
      
      {imageUrl ? (
        <div className="relative rounded-md overflow-hidden border">
          <img 
            src={imageUrl} 
            alt="Post featured image" 
            className="w-full h-[200px] object-cover" 
          />
          {canUploadImages && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-90"
              onClick={handleRemoveImage}
              disabled={isDeleting}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-dashed rounded-md p-8 text-center">
          <Input
            id="image-upload"
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
            disabled={!canUploadImages}
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <div className="text-muted-foreground text-sm">
              {canUploadImages ? (
                <>
                  <p>Drag and drop an image or click to browse</p>
                  <p className="text-xs">PNG, JPG or GIF up to 5MB</p>
                </>
              ) : (
                <p>You don't have permission to upload images</p>
              )}
            </div>
            {canUploadImages && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mt-2"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⊚</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Confirmation dialog for image removal */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Image"
        description="Are you sure you want to remove this image? This action cannot be undone."
        actionLabel={isDeleting ? "Removing..." : "Remove"}
        onAction={confirmImageRemoval}
        variant="destructive"
      />
    </div>
  );
}
