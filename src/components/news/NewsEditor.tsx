
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Upload, Image, X } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

const newsFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  content: z.string().min(1, { message: "Content is required" })
});

type NewsFormValues = z.infer<typeof newsFormSchema>;

interface NewsEditorProps {
  onSuccess: () => void;
  editingPost?: {
    id: string;
    title: string;
    content: string;
    image_url?: string;
  } | null;
  onCancel: () => void;
}

export function NewsEditor({ onSuccess, editingPost = null, onCancel }: NewsEditorProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editingPost?.image_url || null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const form = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: {
      title: editingPost?.title || "",
      content: editingPost?.content || ""
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (values: NewsFormValues) => {
    if (!user) {
      toast.error("You must be logged in to create news posts");
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = editingPost?.image_url || null;

      // Upload image if a new one was selected
      if (imageFile) {
        setIsUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('news_images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('news_images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
        setIsUploadingImage(false);
      }

      // Delete old image if we're replacing it with a new one
      if (editingPost?.image_url && imageFile) {
        // Extract the file path from the URL
        const oldFilePath = editingPost.image_url.split('/').pop();
        if (oldFilePath) {
          await supabase.storage
            .from('news_images')
            .remove([oldFilePath]);
        }
      }

      // Create or update the news post
      if (editingPost) {
        // Update existing post
        const { error } = await supabase
          .from('news_posts')
          .update({
            title: values.title,
            content: values.content,
            image_url: imageUrl
          })
          .eq('id', editingPost.id);

        if (error) throw error;
        toast.success("News post updated successfully");
      } else {
        // Create new post
        const { error } = await supabase
          .from('news_posts')
          .insert({
            title: values.title,
            content: values.content,
            image_url: imageUrl,
            created_by: user.id
          });

        if (error) throw error;
        toast.success("News post created successfully");
      }

      onSuccess();
      form.reset();
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save news post");
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingPost ? "Edit News Post" : "Create News Post"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Image (Optional)</FormLabel>
              <div className="flex flex-col gap-2">
                {imagePreview ? (
                  <div className="relative border rounded-md overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-64 object-cover"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer border-2 border-dashed border-muted-foreground/25 rounded-md p-6 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors">
                    <Image className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload an image</span>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter news content..." 
                      className="min-h-[200px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          type="button"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting || isUploadingImage}
        >
          {isSubmitting || isUploadingImage ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUploadingImage ? "Uploading Image..." : "Saving..."}
            </>
          ) : (
            `${editingPost ? "Update" : "Create"} News Post`
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
