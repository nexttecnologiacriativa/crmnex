-- Safe and idempotent cron job setup
DO $$ 
DECLARE
    job_exists_ap boolean;
    job_exists_n8n boolean;
    job_exists_mc boolean;
BEGIN
    -- Check if jobs exist
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'automation-processor-cron') INTO job_exists_ap;
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'n8n-scheduler-cron') INTO job_exists_n8n;
    SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'marketing-campaign-scheduler-cron') INTO job_exists_mc;

    -- Remove jobs if they exist
    IF job_exists_ap THEN
        PERFORM cron.unschedule('automation-processor-cron');
    END IF;
    
    IF job_exists_n8n THEN
        PERFORM cron.unschedule('n8n-scheduler-cron');
    END IF;
    
    IF job_exists_mc THEN
        PERFORM cron.unschedule('marketing-campaign-scheduler-cron');
    END IF;

    -- Create the automation-processor cron job
    PERFORM cron.schedule(
        'automation-processor-cron',
        '* * * * *',
        'SELECT net.http_post(
            url:=''https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/automation-processor'',
            headers:=''{\"Content-Type\": \"application/json\"}''::jsonb,
            body:=''{}''::jsonb
        ) as request_id;'
    );

    -- Create the n8n-scheduler cron job
    PERFORM cron.schedule(
        'n8n-scheduler-cron',
        '* * * * *',
        'SELECT net.http_post(
            url:=''https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-scheduler'',
            headers:=''{\"Content-Type\": \"application/json\"}''::jsonb,
            body:=''{}''::jsonb
        ) as request_id;'
    );

    -- Create the marketing-campaign-scheduler cron job
    PERFORM cron.schedule(
        'marketing-campaign-scheduler-cron',
        '* * * * *',
        'SELECT net.http_post(
            url:=''https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/marketing-campaign-scheduler'',
            headers:=''{\"Content-Type\": \"application/json\"}''::jsonb,
            body:=''{}''::jsonb
        ) as request_id;'
    );

END $$;