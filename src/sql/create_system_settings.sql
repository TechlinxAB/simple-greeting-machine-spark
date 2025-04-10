
-- Create a system_settings table to store application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to restrict access to system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read system settings (for company news and appearance)
CREATE POLICY "Anyone can read system settings" 
  ON public.system_settings 
  FOR SELECT 
  USING (true);

-- Only administrators and managers can update system settings
CREATE POLICY "Administrators and managers can insert system settings" 
  ON public.system_settings 
  FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Administrators and managers can update system settings" 
  ON public.system_settings 
  FOR UPDATE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'manager')
    )
  );

CREATE POLICY "Administrators can delete system settings" 
  ON public.system_settings 
  FOR DELETE 
  USING (
    auth.role() = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default settings - Updated to match the green theme
INSERT INTO public.system_settings (id, settings)
VALUES ('app_settings', '{
  "appName": "Techlinx Time Tracker", 
  "primaryColor": "#4ba64b", 
  "secondaryColor": "#e8f5e9",
  "sidebarColor": "#326c32",
  "accentColor": "#4caf50"
}')
ON CONFLICT (id) DO UPDATE
SET settings = '{
  "appName": "Techlinx Time Tracker", 
  "primaryColor": "#4ba64b", 
  "secondaryColor": "#e8f5e9",
  "sidebarColor": "#326c32",
  "accentColor": "#4caf50"
}';

-- Insert default company news
INSERT INTO public.system_settings (id, settings)
VALUES ('company_news', 'Welcome to Techlinx Time Tracker company news! This is where important company announcements will be posted by administrators and managers.')
ON CONFLICT (id) DO NOTHING;

-- Add a function to apply color theme
CREATE OR REPLACE FUNCTION public.apply_theme_to_css_variables()
RETURNS TRIGGER AS $$
DECLARE
  theme_settings JSONB;
BEGIN
  -- Get the app settings
  SELECT settings INTO theme_settings 
  FROM public.system_settings 
  WHERE id = 'app_settings';
  
  -- We're just updating the trigger, the actual CSS changes are handled client-side
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update css when theme changes
CREATE TRIGGER update_theme_css
AFTER UPDATE ON public.system_settings
FOR EACH ROW
WHEN (NEW.id = 'app_settings')
EXECUTE FUNCTION public.apply_theme_to_css_variables();
