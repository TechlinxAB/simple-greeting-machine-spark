
-- Create a system_settings table to store application settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies to restrict access to system settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only administrators can access system settings
CREATE POLICY "Administrators can read system settings" 
  ON public.system_settings 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Administrators can insert system settings" 
  ON public.system_settings 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Administrators can update system settings" 
  ON public.system_settings 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Administrators can delete system settings" 
  ON public.system_settings 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

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
