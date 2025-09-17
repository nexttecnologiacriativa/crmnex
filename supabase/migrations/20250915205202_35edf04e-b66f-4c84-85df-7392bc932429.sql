-- Criar trigger para processar automações quando um lead é criado
CREATE OR REPLACE FUNCTION public.trigger_lead_automation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar trigger que dispara quando um lead é inserido
DROP TRIGGER IF EXISTS trigger_automation_on_lead_created ON public.leads;
CREATE TRIGGER trigger_automation_on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_automation();