
-- Modify the existing cron job to run every 15 minutes instead of 30 minutes
DO $$
BEGIN
  -- Drop the existing cron job
  PERFORM cron.unschedule('refresh-fortnox-token-frequent');
  
  -- Replace with a more frequent schedule (every 15 minutes)
  PERFORM cron.schedule(
    'refresh-fortnox-token-frequent',
    '*/15 * * * *',  -- Run every 15 minutes
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "fortnox-refresh-secret-key-xojrleypudfrbmvejpow"
      }'::jsonb,
      body:='{"scheduled": true, "force": false}'::jsonb
    ) as request_id;
    $$
  );
  
  -- Add a second job that runs every 12 hours with force=true to ensure token is refreshed
  -- This is a backup to make sure we refresh even if the regular job fails
  PERFORM cron.schedule(
    'refresh-fortnox-token-forced',
    '0 */12 * * *',  -- Run every 12 hours (at 00:00 and 12:00)
    $$
    SELECT net.http_post(
      url:='https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/fortnox-scheduled-refresh',
      headers:='{
        "Content-Type": "application/json", 
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvanJsZXlwdWRmcmJtdmVqcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMzUzNjEsImV4cCI6MjA1OTcxMTM2MX0.Wzo_PseuNTU2Lk3qTRbrJxN8H-M1U2FhMLEc_h7yrUc",
        "x-api-key": "fortnox-refresh-secret-key-xojrleypudfrbmvejpow"
      }'::jsonb,
      body:='{"scheduled": true, "force": true}'::jsonb
    ) as request_id;
    $$
  );
END
$$;
