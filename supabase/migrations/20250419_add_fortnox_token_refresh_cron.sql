
-- Enable required extensions for cron jobs with HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get the Supabase project reference and anon key
DO $$
DECLARE
  project_ref TEXT := 'xojrleypudfrbmvejpow';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc';
  refresh_secret TEXT := 'fortnox-refresh-secret-key-' || md5(random()::text);
BEGIN
  -- Store the refresh secret in server settings
  -- This will create a random secret key for each deployment
  EXECUTE format('ALTER DATABASE postgres SET app.settings.fortnox_refresh_secret = %L', refresh_secret);
  
  -- Schedule token refresh every 24 hours
  PERFORM cron.schedule(
    'refresh-fortnox-token-daily',
    '0 3 * * *',  -- Run at 3:00 AM every day
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "' || current_setting('app.settings.fortnox_refresh_secret') || '"
      }'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;
