-- Criar trigger que chama automaticamente o processador n8n quando um item é adicionado à fila
CREATE OR REPLACE FUNCTION public.trigger_n8n_processor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_code int;
BEGIN
  -- Só processar itens de n8n
  IF NEW.trigger_type = 'n8n_lead_notification' AND NEW.status = 'pending' THEN
    -- Chamar o processador n8n usando a nova abordagem
    PERFORM supabase_functions.http_post(
      'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-automation-processor'::text,
      '{}'::jsonb,
      '{}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Criar o trigger na tabela automation_queue
DROP TRIGGER IF EXISTS on_n8n_queue_insert ON automation_queue;
CREATE TRIGGER on_n8n_queue_insert
  AFTER INSERT ON automation_queue
  FOR EACH ROW
  EXECUTE FUNCTION trigger_n8n_processor();