-- Modificar trigger log_lead_stage_change para lidar com user_id NULL
-- quando chamado de Edge Functions (automações)

DROP FUNCTION IF EXISTS public.log_lead_stage_change() CASCADE;

CREATE OR REPLACE FUNCTION public.log_lead_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executing_user_id uuid;
BEGIN
  -- Só executar em UPDATE, não em DELETE
  IF TG_OP = 'UPDATE' AND (OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.pipeline_id IS DISTINCT FROM NEW.pipeline_id) THEN
    
    -- Tentar obter o user_id do contexto de autenticação
    -- Se for NULL (chamada de Edge Function), usar o owner do workspace
    executing_user_id := auth.uid();
    
    IF executing_user_id IS NULL THEN
      -- Buscar o owner do workspace para usar como user_id
      SELECT owner_id INTO executing_user_id
      FROM workspaces
      WHERE id = NEW.workspace_id
      LIMIT 1;
    END IF;
    
    -- Se ainda for NULL (caso improvável), usar um UUID padrão do sistema
    IF executing_user_id IS NULL THEN
      executing_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.id,
      executing_user_id,
      'stage_change',
      'Mudança de estágio',
      'Lead movido no pipeline',
      jsonb_build_object(
        'old_pipeline_id', OLD.pipeline_id,
        'new_pipeline_id', NEW.pipeline_id,
        'old_stage_id', OLD.stage_id,
        'new_stage_id', NEW.stage_id,
        'timestamp', now(),
        'automated', auth.uid() IS NULL
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER log_lead_stage_change_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_stage_change();