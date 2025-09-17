-- Ensure all relevant schedulers run every minute via pg_cron
-- 1) Unschedule existing jobs (ignore if they don't exist)
SELECT cron.unschedule('automation-processor-cron');
SELECT cron.unschedule('n8n-scheduler-cron');
SELECT cron.unschedule('marketing-campaign-scheduler-cron');

-- 2) Schedule automation-processor every minute
SELECT cron.schedule(
  'automation-processor-cron',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/automation-processor',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 3) Schedule n8n-scheduler every minute
SELECT cron.schedule(
  'n8n-scheduler-cron',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-scheduler',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- 4) Schedule marketing-campaign-scheduler every minute
SELECT cron.schedule(
  'marketing-campaign-scheduler-cron',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/marketing-campaign-scheduler',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);