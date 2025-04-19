
-- Modify the existing cron job to run every 30 minutes instead of daily
DO $$
BEGIN
  -- Drop the existing daily cron job
  PERFORM cron.unschedule('refresh-fortnox-token-daily');
  
  -- Replace with a more frequent schedule (every 30 minutes)
  PERFORM cron.schedule(
    'refresh-fortnox-token-frequent',
    '*/30 * * * *',  -- Run every 30 minutes
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "fortnox-refresh-secret-key-xojrleypudfrbmvejpow"
      }'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;
