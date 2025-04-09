
-- Add support for news posts with images
CREATE TABLE IF NOT EXISTS public.news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for news posts
ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read news posts
CREATE POLICY "Anyone can read news posts" 
  ON public.news_posts 
  FOR SELECT 
  USING (true);

-- Only administrators and managers can create news posts
CREATE POLICY "Administrators and managers can create news posts" 
  ON public.news_posts 
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only administrators and managers can update their own news posts
CREATE POLICY "Administrators and managers can update their own news posts" 
  ON public.news_posts 
  FOR UPDATE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Only administrators and managers can delete their own news posts
CREATE POLICY "Administrators and managers can delete their own news posts" 
  ON public.news_posts 
  FOR DELETE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_news_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the timestamp
CREATE TRIGGER update_news_posts_updated_at
BEFORE UPDATE ON public.news_posts
FOR EACH ROW
EXECUTE FUNCTION update_news_posts_updated_at();

-- Create a storage bucket for news images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('news_images', 'News Images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for the news_images bucket
CREATE POLICY "Public can view news images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'news_images');

CREATE POLICY "Administrators and managers can upload news images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'news_images' AND
  (auth.role() = 'service_role' OR
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
   ))
);

CREATE POLICY "Administrators and managers can update news images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'news_images' AND
  (auth.role() = 'service_role' OR
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
   ))
);

CREATE POLICY "Administrators and managers can delete news images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'news_images' AND
  (auth.role() = 'service_role' OR
   EXISTS (
     SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
   ))
);
