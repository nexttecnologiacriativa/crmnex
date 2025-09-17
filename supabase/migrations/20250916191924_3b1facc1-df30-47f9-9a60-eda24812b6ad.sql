-- Clean up and recreate pg_cron schedules with correct JSON headers to ensure automations run independent of the app being open
-- Safely unschedule any existing jobs (ignore if they don't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('automation-processor');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('automation-processor-cron');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('n8n-scheduler');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('n8n-scheduler-cron');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('marketing-campaign-scheduler');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('marketing-campaign-scheduler-cron');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Recreate only the canonical "*-cron" jobs with valid JSON headers
-- Runs every minute
SELECT cron.schedule(
  'automation-processor-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/automation-processor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MzYyMDYsImV4cCI6MjA2NTMxMjIwNn0.U273gBioeUGMN7T0AKIzI-lTRopsEflpEOTCWKoJTDI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'n8n-scheduler-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MzYyMDYsImV4cCI6MjA2NTMxMjIwNn0.U273gBioeUGMN7T0AKIzI-lTRopsEflpEOTCWKoJTDI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'marketing-campaign-scheduler-cron',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/marketing-campaign-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MzYyMDYsImV4cCI6MjA2NTMxMjIwNn0.U273gBioeUGMN7T0AKIzI-lTRopsEflpEOTCWKoJTDI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
