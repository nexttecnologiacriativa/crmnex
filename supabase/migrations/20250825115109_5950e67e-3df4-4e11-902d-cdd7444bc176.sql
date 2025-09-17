-- Corrigir o trigger para usar a função correta do Supabase
CREATE OR REPLACE FUNCTION public.trigger_n8n_processor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só processar itens de n8n
  IF NEW.trigger_type = 'n8n_lead_notification' AND NEW.status = 'pending' THEN
    -- Invocar edge function para processar n8n
    PERFORM supabase.functions.invoke('n8n-automation-processor');
  END IF;

  RETURN NEW;
END;
$$;