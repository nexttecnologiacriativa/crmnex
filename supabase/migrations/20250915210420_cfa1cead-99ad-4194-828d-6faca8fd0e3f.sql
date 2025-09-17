-- Corrigir search_path da função de trigger de automação
CREATE OR REPLACE FUNCTION public.trigger_lead_automation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir na fila de automação para processamento de lead criado
  INSERT INTO public.automation_queue (
    workspace_id,
    trigger_type,
    lead_id,
    trigger_data,
    created_at
  ) VALUES (
    NEW.workspace_id,
    'lead_created',
    NEW.id,
    jsonb_build_object(
      'lead_id', NEW.id,
      'workspace_id', NEW.workspace_id
    ),
    now()
  );
  
  RETURN NEW;
END;
$$;