
-- Function to save system settings
CREATE OR REPLACE FUNCTION public.save_system_settings(
  setting_id TEXT,
  setting_data JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.system_settings (id, settings)
  VALUES (setting_id, setting_data)
  ON CONFLICT (id) 
  DO UPDATE SET 
    settings = setting_data,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system settings
CREATE OR REPLACE FUNCTION public.get_system_settings(
  setting_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  setting_result JSONB;
BEGIN
  SELECT settings INTO setting_result
  FROM public.system_settings
  WHERE id = setting_id;
  
  RETURN setting_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete system settings
CREATE OR REPLACE FUNCTION public.delete_system_settings(
  setting_id TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.system_settings
  WHERE id = setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
