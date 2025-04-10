
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Pencil, Check, Save, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { NewsPost } from "@/types/database";
import { NewsImageUpload } from "./NewsImageUpload";

interface NewsEditorProps {
  onSuccess: () => void;
  editingPost?: NewsPost | null;
  onCancel: () => void;
}

export function NewsEditor({ onSuccess, editingPost = null, onCancel }: NewsEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editingPost?.title || "");
  const [content, setContent] = useState(editingPost?.content || "");
  const [imageUrl, setImageUrl] = useState<string>(editingPost?.image_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!editingPost;

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || "");
      setContent(editingPost.content || "");
      setImageUrl(editingPost.image_url || "");
    }
  }, [editingPost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a news post");
      return;
    }

    if (!title.trim()) {
      toast.error("Please provide a title for the news post");
      return;
    }

    if (!content.trim()) {
      toast.error("Please provide content for the news post");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && editingPost) {
        // Update existing post
        const { error } = await supabase
          .from("news_posts")
          .update({
            title,
            content,
            image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingPost.id);

        if (error) throw error;
        toast.success("News post updated successfully");
      } else {
        // Create new post
        const { error } = await supabase
          .from("news_posts")
          .insert({
            title,
            content,
            image_url: imageUrl,
            created_by: user.id
          });

        if (error) throw error;
        toast.success("News post created successfully");
      }

      // Clear form and notify parent
      setTitle("");
      setContent("");
      setImageUrl("");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving news post:", error);
      toast.error(error.message || "Failed to save news post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleImageUploaded = (url: string) => {
    setImageUrl(url);
  };

  return (
    <Card className="mb-6">
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center text-lg font-semibold">
              <Pencil className="mr-2 h-5 w-5" />
              {isEditing ? "Edit Post" : "New Post"}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <NewsImageUpload
            initialImageUrl={imageUrl}
            onImageUploaded={handleImageUploaded}
          />

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter post content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="min-h-[200px]"
            />
          </div>
        </CardContent>

        <CardFooter className="justify-end space-x-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="gap-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditing ? "Updating..." : "Publishing..."}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {isEditing ? "Update" : "Publish"}
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
