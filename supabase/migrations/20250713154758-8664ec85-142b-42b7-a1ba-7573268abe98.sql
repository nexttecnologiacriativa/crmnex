-- Primeiro, vamos remover o cron job existente caso exista
SELECT cron.unschedule('marketing-campaign-scheduler');

-- Verificar se as extensões estão habilitadas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verificar se o job existe na tabela cron.job
DO $$
BEGIN
    -- Se a tabela cron.job existe, mostrar jobs existentes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'cron' AND tablename = 'job') THEN
        RAISE NOTICE 'Cron extension is available. Current jobs:';
        -- Lista jobs existentes
        FOR rec IN SELECT jobname, schedule, command, active FROM cron.job LOOP
            RAISE NOTICE 'Job: %, Schedule: %, Active: %', rec.jobname, rec.schedule, rec.active;
        END LOOP;
    ELSE
        RAISE NOTICE 'Cron extension not available or not properly configured';
    END IF;
END $$;

-- Recriar o cron job com configurações corretas
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

-- Criar uma função para testar o scheduler manualmente
CREATE OR REPLACE FUNCTION public.test_marketing_scheduler()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Chama a edge function diretamente
    SELECT net.http_post(
        url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/marketing-campaign-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc0NTM4NSwiZXhwIjoyMDUwMzIxMzg1fQ.kwfWHrQ8M0O0MnF-7BLVgF5Pb2EiEPKGNqI9c_nOj8Y"}'::jsonb,
        body := '{}'::jsonb
    ) INTO result;
    
    RETURN result;
END;
$$;