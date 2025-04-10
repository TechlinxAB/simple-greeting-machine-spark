
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface NewsImageUploadProps {
  initialImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
}

export function NewsImageUpload({ initialImageUrl, onImageUploaded }: NewsImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const filePath = `${fileName}`;

      // Upload the image - no need to check bucket existence or create bucket
      // as we've already confirmed the bucket exists through our SQL operation
      const { error: uploadError, data } = await supabase
        .storage
        .from('news_images')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from('news_images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
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
    setImageUrl(null);
    onImageUploaded('');
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
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-90"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
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
          />
          <div className="flex flex-col items-center justify-center space-y-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <div className="text-muted-foreground text-sm">
              <p>Drag and drop an image or click to browse</p>
              <p className="text-xs">PNG, JPG or GIF up to 5MB</p>
            </div>
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
          </div>
        </div>
      )}
    </div>
  );
}
