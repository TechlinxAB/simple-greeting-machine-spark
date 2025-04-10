
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ProfileImageUpload = ({ 
  avatarUrl,
  onImageUploaded
}: { 
  avatarUrl?: string | null,
  onImageUploaded: (url: string) => void
}) => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      // Create a unique file name to prevent collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;
      
      console.log('Uploading to path:', filePath);
      console.log('Bucket: app-assets');
      
      // Convert file to binary buffer for upload
      const fileBuffer = await file.arrayBuffer();
      
      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('app-assets')
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: file.type
        });
        
      if (uploadError) {
        console.error('Error uploading profile image:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);
      
      console.log('Upload successful, public URL:', publicUrl);
      
      // Pass the URL to parent component
      onImageUploaded(publicUrl);
      
      toast.success('Profile image uploaded successfully');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('Failed to upload profile image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!avatarUrl || !user) return;

    setIsUploading(true);
    try {
      // Extract the file path from the URL
      const storageUrl = supabase.storage.from('app-assets').getPublicUrl('').data.publicUrl;
      const filePath = avatarUrl.replace(storageUrl, '');
      
      // Remove the leading slash if present
      const cleanFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      
      console.log('Deleting file from path:', cleanFilePath);
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('app-assets')
        .remove([cleanFilePath]);
        
      if (error) {
        console.error('Error removing profile image:', error);
        throw error;
      }
      
      // Update profile
      onImageUploaded('');
      
      toast.success('Profile image removed successfully');
    } catch (error) {
      console.error('Error removing profile image:', error);
      toast.error('Failed to remove profile image');
    } finally {
      setIsUploading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={isUploading}
          onClick={() => document.getElementById('profile-image-upload')?.click()}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Image
            </>
          )}
        </Button>
        
        {avatarUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
            disabled={isUploading}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Remove Image
          </Button>
        )}
        
        <input
          id="profile-image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your profile image. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteImage}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileImageUpload;
