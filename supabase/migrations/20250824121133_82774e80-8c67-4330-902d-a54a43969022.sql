-- Criar trigger correto para n8n que não usa net.http_post
-- Em vez disso, usaremos uma abordagem que chama a edge function diretamente

-- Primeiro, criar a função que será chamada pelo trigger
CREATE OR REPLACE FUNCTION notify_n8n_on_lead_created()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar o trigger
CREATE TRIGGER n8n_lead_notification_trigger
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION notify_n8n_on_lead_created();