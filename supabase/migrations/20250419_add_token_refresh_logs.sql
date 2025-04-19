
-- Create a table to track token refresh history
CREATE TABLE IF NOT EXISTS public.token_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  success BOOLEAN NOT NULL,
  message TEXT,
  token_length INTEGER,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set up RLS policies
ALTER TABLE public.token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for admins/managers to view logs
CREATE POLICY "Admins and managers can view token refresh logs" 
  ON public.token_refresh_logs 
  FOR SELECT 
  TO authenticated
  USING (public.is_admin_or_manager());

-- Create trigger to update updated_at
CREATE TRIGGER set_token_refresh_logs_updated_at
  BEFORE UPDATE ON public.token_refresh_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_settings_updated_at();

-- Add some indexes for better performance
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_created_at ON public.token_refresh_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_success ON public.token_refresh_logs (success);
