-- Remover o trigger problemático e corrigir
DROP TRIGGER IF EXISTS on_n8n_queue_insert ON automation_queue;
DROP FUNCTION IF EXISTS public.trigger_n8n_processor();

-- Criar uma abordagem mais simples usando pg_cron para processar a fila
SELECT cron.schedule(
  'process-n8n-queue',
  '* * * * *', -- a cada minuto
  $$
  SELECT net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-automation-processor',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4cGFhc2tiaGJkaXJseGFhdnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MzYyMDYsImV4cCI6MjA2NTMxMjIwNn0.U273gBioeUGMN7T0AKIzI-lTRopsEflpEOTCWKoJTDI", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verificar se o trigger notify_n8n_on_lead_created ainda existe e está funcionando
-- Se não existe, vamos recriá-lo
CREATE OR REPLACE FUNCTION public.notify_n8n_on_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_count int;
BEGIN
  -- Verificar se há webhooks n8n ativos para este workspace e pipeline
  SELECT COUNT(*) INTO webhook_count
  FROM public.n8n_webhooks 
  WHERE workspace_id = NEW.workspace_id 
    AND pipeline_id = NEW.pipeline_id 
    AND is_active = true;

  -- Se há webhooks, fazer uma inserção na tabela automation_queue para processar depois
  IF webhook_count > 0 THEN
    INSERT INTO public.automation_queue (
      workspace_id,
      trigger_type,
      lead_id,
      trigger_data,
      created_at
    ) VALUES (
      NEW.workspace_id,
      'n8n_lead_notification',
      NEW.id,
      jsonb_build_object(
        'lead_id', NEW.id,
        'pipeline_id', NEW.pipeline_id,
        'workspace_id', NEW.workspace_id
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger se não existir
DROP TRIGGER IF EXISTS notify_n8n_on_lead_created_trigger ON leads;
CREATE TRIGGER notify_n8n_on_lead_created_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_on_lead_created();