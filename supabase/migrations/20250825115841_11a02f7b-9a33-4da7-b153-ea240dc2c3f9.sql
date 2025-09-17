-- Corrigir ambos os problemas

-- 1. Primeiro, vamos garantir que o trigger do webhook funcione sem tentar chamar functions
-- Verificar se há alguma função problemática e removê-la
DROP FUNCTION IF EXISTS public.process_n8n_queue();

-- 2. Recriar o trigger do n8n de forma mais simples e funcional
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
  
  RETURN NEW;
END;
$$;

-- 3. Garantir que o trigger existe
DROP TRIGGER IF EXISTS notify_n8n_on_lead_created_trigger ON leads;
CREATE TRIGGER notify_n8n_on_lead_created_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_on_lead_created();

-- 4. Verificar se existe alguma outra função que possa estar causando o erro do webhook
-- Remover qualquer função que tente usar supabase.functions.invoke
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oid 
        FROM pg_proc 
        WHERE prosrc LIKE '%supabase.functions.invoke%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || ' CASCADE';
        RAISE NOTICE 'Dropped problematic function: %', func_record.proname;
    END LOOP;
END $$;