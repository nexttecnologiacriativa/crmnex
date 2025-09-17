-- Criar trigger para automação de mudança de etapa no pipeline
CREATE OR REPLACE FUNCTION public.notify_pipeline_stage_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se a etapa mudou
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    -- Inserir na fila de automação para mudança de etapa
    INSERT INTO public.automation_queue (
      workspace_id,
      trigger_type,
      lead_id,
      trigger_data,
      created_at,
      status
    ) VALUES (
      NEW.workspace_id,
      'pipeline_stage_changed',
      NEW.id,
      jsonb_build_object(
        'lead_id', NEW.id,
        'old_stage_id', OLD.stage_id,
        'new_stage_id', NEW.stage_id,
        'pipeline_id', NEW.pipeline_id,
        'workspace_id', NEW.workspace_id
      ),
      now(),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar o trigger na tabela leads
DROP TRIGGER IF EXISTS trigger_pipeline_stage_changed ON public.leads;
CREATE TRIGGER trigger_pipeline_stage_changed
  AFTER UPDATE OF stage_id ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pipeline_stage_changed();