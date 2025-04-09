
import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface NewsPostProps {
  post: {
    id: string;
    title: string;
    content: string;
    image_url?: string | null;
    created_at: string;
    updated_at?: string | null;
    created_by: string;
  };
  onEdit: (post: any) => void;
  onDelete: (id: string) => void;
}

export function NewsPost({ post, onEdit, onDelete }: NewsPostProps) {
  const { role } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const canManagePosts = role === 'admin' || role === 'manager';
  const createdDate = new Date(post.created_at);
  const updatedDate = post.updated_at ? new Date(post.updated_at) : null;
  
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Check if there's an image to delete
      if (post.image_url) {
        // Extract the file name from the URL
        const fileName = post.image_url.split('/').pop();
        
        if (fileName) {
          // Delete the image from storage
          await supabase.storage
            .from('news_images')
            .remove([fileName]);
        }
      }
      
      // Delete the post
      const { error } = await supabase
        .from('news_posts')
        .delete()
        .eq('id', post.id);
        
      if (error) throw error;
      
      toast.success("News post deleted successfully");
      onDelete(post.id);
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete news post");
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <Card className="mb-6 overflow-hidden">
        {post.image_url && (
          <div className="w-full h-64 overflow-hidden bg-secondary">
            <img 
              src={post.image_url} 
              alt={post.title} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}
        
        <CardContent className="p-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">{post.title}</h3>
              {canManagePosts && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(post)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Posted on {format(createdDate, 'MMMM d, yyyy')}
              {updatedDate && updatedDate.getTime() !== createdDate.getTime() && (
                <> · Updated on {format(updatedDate, 'MMMM d, yyyy')}</>
              )}
            </div>
            <div className="mt-4 whitespace-pre-wrap">{post.content}</div>
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this news post. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
