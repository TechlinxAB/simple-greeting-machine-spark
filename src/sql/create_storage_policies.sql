
-- Create the app-assets bucket if it doesn't exist yet
CREATE POLICY "Allow public access to app-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

-- Admin and manager users can insert/update app assets
CREATE POLICY "Admin and manager can insert app assets" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'app-assets' AND 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
);

-- Admin and manager users can update app assets
CREATE POLICY "Admin and manager can update app assets" 
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'app-assets' AND 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
);

-- Admin and manager users can delete app assets
CREATE POLICY "Admin and manager can delete app assets" 
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-assets' AND 
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ))
);
