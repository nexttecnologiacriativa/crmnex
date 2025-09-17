-- Robust, idempotent cron setup for background schedulers
-- 1) Try to unschedule existing jobs (ignore errors if missing)
DO $$ BEGIN
  PERFORM cron.unschedule('automation-processor-cron');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('n8n-scheduler-cron');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('marketing-campaign-scheduler-cron');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2) Schedule automation-processor every minute if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-processor-cron') THEN
    PERFORM cron.schedule(
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
  END IF;
END $$;

-- 3) Schedule n8n-scheduler every minute if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'n8n-scheduler-cron') THEN
    PERFORM cron.schedule(
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
  END IF;
END $$;

-- 4) Schedule marketing-campaign-scheduler every minute if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'marketing-campaign-scheduler-cron') THEN
    PERFORM cron.schedule(
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
  END IF;
END $$;