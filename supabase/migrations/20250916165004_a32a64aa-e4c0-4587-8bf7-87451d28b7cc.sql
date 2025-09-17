-- Unschedule the problematic cron jobs that were set to run every 30 seconds
SELECT cron.unschedule('automation-processor-cron');
SELECT cron.unschedule('n8n-scheduler-cron');

-- Reschedule them to run every minute instead (pg_cron minimum interval)
SELECT cron.schedule(
  'automation-processor-cron',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/automation-processor',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'n8n-scheduler-cron',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-scheduler',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);