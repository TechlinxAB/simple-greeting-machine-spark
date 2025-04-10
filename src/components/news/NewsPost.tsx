
import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash2, AlertCircle, CalendarClock, UserCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { NewsPost as NewsPostType } from "@/types/database";

interface NewsPostProps {
  post: NewsPostType;
  onEdit: (post: NewsPostType) => void;
  onDelete: () => void;
}

export function NewsPost({ post, onEdit, onDelete }: NewsPostProps) {
  const { role } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const canEdit = role === 'admin' || role === 'manager';
  
  const handleDelete = async () => {
    if (!canEdit) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from("news_posts")
        .delete()
        .eq("id", post.id);
      
      if (error) throw error;
      
      toast.success("News post deleted successfully");
      onDelete();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting news post:", error);
      toast.error(error.message || "Failed to delete news post");
    } finally {
      setIsDeleting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMMM d, yyyy");
  };
  
  return (
    <>
      <Card className="overflow-hidden">
        {post.image_url && (
          <div className="w-full h-[250px] relative">
            <img 
              src={post.image_url} 
              alt={post.title} 
              className="w-full h-full object-cover" 
              onError={(e) => {
                // If image fails to load, hide it
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-bold">{post.title}</CardTitle>
            {canEdit && (
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(post)}
                  title="Edit post"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete post"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center text-sm text-muted-foreground gap-4">
            <div className="flex items-center">
              <CalendarClock className="mr-1 h-3 w-3" />
              <span>{formatDate(post.created_at)}</span>
            </div>
            <div className="flex items-center">
              <UserCircle className="mr-1 h-3 w-3" />
              <span>Admin</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm sm:prose max-w-none">
            {post.content.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete News Post</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-start gap-2 text-amber-500 mb-4">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>This action cannot be undone. The post will be permanently deleted.</span>
              </div>
              <div>Are you sure you want to delete the post "{post.title}"?</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
