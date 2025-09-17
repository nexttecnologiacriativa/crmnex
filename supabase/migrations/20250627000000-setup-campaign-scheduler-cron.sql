
-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run the marketing campaign scheduler every minute
SELECT cron.schedule(
  'marketing-campaign-scheduler',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/marketing-campaign-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc0NTM4NSwiZXhwIjoyMDUwMzIxMzg1fQ.kwfWHrQ8M0O0MnF-7BLVgF5Pb2EiEPKGNqI9c_nOj8Y"}'::jsonb,
        body := '{}'::jsonb
    ) as request_id;
  $$
);
