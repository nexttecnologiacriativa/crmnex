-- Remove trigger duplicado se existir
DROP TRIGGER IF EXISTS notify_n8n_lead_created ON public.leads;

-- Recria o trigger com lógica de prevenção de duplicação
CREATE OR REPLACE FUNCTION public.notify_n8n_on_lead_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  webhook_count int;
  existing_count int;
BEGIN
  -- Verificar se há webhooks n8n ativos para este workspace e pipeline
  SELECT COUNT(*) INTO webhook_count
  FROM public.n8n_webhooks 
  WHERE workspace_id = NEW.workspace_id 
    AND pipeline_id = NEW.pipeline_id 
    AND is_active = true;

  -- Se há webhooks, verificar se já existe na fila para evitar duplicação
  IF webhook_count > 0 THEN
    -- Verificar se já existe uma entrada pendente ou processando para este lead
    SELECT COUNT(*) INTO existing_count
    FROM public.automation_queue
    WHERE trigger_type = 'n8n_lead_notification'
      AND lead_id = NEW.id
      AND status IN ('pending', 'processing');

    -- Só inserir se não existir uma entrada pendente/processando
    IF existing_count = 0 THEN
      INSERT INTO public.automation_queue (
        workspace_id,
        trigger_type,
        lead_id,
        trigger_data,
        created_at,
        status
      ) VALUES (
        NEW.workspace_id,
        'n8n_lead_notification',
        NEW.id,
        jsonb_build_object(
          'lead_id', NEW.id,
          'pipeline_id', NEW.pipeline_id,
          'workspace_id', NEW.workspace_id
        ),
        now(),
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o trigger
CREATE TRIGGER notify_n8n_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION notify_n8n_on_lead_created();

-- Adicionar índice único para prevenir duplicação na fila
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_queue_unique_n8n_lead 
ON public.automation_queue (lead_id, trigger_type) 
WHERE trigger_type = 'n8n_lead_notification' AND status IN ('pending', 'processing');