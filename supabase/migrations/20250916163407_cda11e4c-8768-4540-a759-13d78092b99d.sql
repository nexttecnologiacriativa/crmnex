-- Habilitar extensões necessárias para schedulers automáticos
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar tabela para logs dos schedulers se não existir
CREATE TABLE IF NOT EXISTS public.scheduler_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduler_name TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  campaigns_found INTEGER DEFAULT 0,
  campaigns_processed INTEGER DEFAULT 0,
  campaigns_successful INTEGER DEFAULT 0,
  campaigns_failed INTEGER DEFAULT 0,
  execution_duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS policy para logs dos schedulers
ALTER TABLE public.scheduler_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduler logs from their workspace" ON public.scheduler_logs
FOR SELECT USING (true); -- Permite visualização para todos os usuários autenticados

-- Agendar Marketing Campaign Scheduler (a cada minuto)
SELECT cron.schedule(
  'marketing-campaign-scheduler',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/marketing-campaign-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTczNjIwNiwiZXhwIjoyMDY1MzEyMjA2fQ.moyzc2dq23R5ju9bVNFUgC-VT6HGmQcN4jFFkvW1DoY"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Agendar Automation Processor (a cada 30 segundos)
SELECT cron.schedule(
  'automation-processor',
  '*/30 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/automation-processor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTczNjIwNiwiZXhwIjoyMDY1MzEyMjA2fQ.moyzc2dq23R5ju9bVNFUgC-VT6HGmQcN4jFFkvW1DoY"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Agendar N8N Scheduler (a cada 30 segundos)
SELECT cron.schedule(
  'n8n-scheduler',
  '*/30 * * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-scheduler',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTczNjIwNiwiZXhwIjoyMDY1MzEyMjA2fQ.moyzc2dq23R5ju9bVNFUgC-VT6HGmQcN4jFFkvW1DoY"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);