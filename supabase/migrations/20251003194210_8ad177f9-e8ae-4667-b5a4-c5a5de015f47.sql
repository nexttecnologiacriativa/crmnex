-- Adicionar ON DELETE CASCADE em todas as tabelas relacionadas

-- lead_tag_relations
ALTER TABLE lead_tag_relations 
DROP CONSTRAINT IF EXISTS lead_tag_relations_lead_id_fkey;
ALTER TABLE lead_tag_relations 
ADD CONSTRAINT lead_tag_relations_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- lead_pipeline_relations
ALTER TABLE lead_pipeline_relations 
DROP CONSTRAINT IF EXISTS lead_pipeline_relations_lead_id_fkey;
ALTER TABLE lead_pipeline_relations 
ADD CONSTRAINT lead_pipeline_relations_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- tasks
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_lead_id_fkey;
ALTER TABLE tasks 
ADD CONSTRAINT tasks_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- whatsapp_conversations
ALTER TABLE whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_lead_id_fkey;
ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT whatsapp_conversations_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- automation_logs
ALTER TABLE automation_logs 
DROP CONSTRAINT IF EXISTS automation_logs_lead_id_fkey;
ALTER TABLE automation_logs 
ADD CONSTRAINT automation_logs_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- automation_executions
ALTER TABLE automation_executions 
DROP CONSTRAINT IF EXISTS automation_executions_lead_id_fkey;
ALTER TABLE automation_executions 
ADD CONSTRAINT automation_executions_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;

-- campaign_recipients
ALTER TABLE campaign_recipients 
DROP CONSTRAINT IF EXISTS campaign_recipients_lead_id_fkey;
ALTER TABLE campaign_recipients 
ADD CONSTRAINT campaign_recipients_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- marketing_campaign_recipients
ALTER TABLE marketing_campaign_recipients 
DROP CONSTRAINT IF EXISTS marketing_campaign_recipients_lead_id_fkey;
ALTER TABLE marketing_campaign_recipients 
ADD CONSTRAINT marketing_campaign_recipients_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

-- Modificar triggers para não executar em DELETE
CREATE OR REPLACE FUNCTION log_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executar em UPDATE, não em DELETE
  IF TG_OP = 'UPDATE' AND (OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.pipeline_id IS DISTINCT FROM NEW.pipeline_id) THEN
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'stage_change',
      'Mudança de estágio',
      'Lead movido no pipeline',
      jsonb_build_object(
        'old_pipeline_id', OLD.pipeline_id,
        'new_pipeline_id', NEW.pipeline_id,
        'old_stage_id', OLD.stage_id,
        'new_stage_id', NEW.stage_id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION log_lead_data_change()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb := '{}'::jsonb;
  has_changes boolean := false;
BEGIN
  -- Só executar em UPDATE, não em DELETE
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Verificar mudanças em campos importantes
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    changes := changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    has_changes := true;
  END IF;
  
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    changes := changes || jsonb_build_object('email', jsonb_build_object('old', OLD.email, 'new', NEW.email));
    has_changes := true;
  END IF;
  
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    changes := changes || jsonb_build_object('phone', jsonb_build_object('old', OLD.phone, 'new', NEW.phone));
    has_changes := true;
  END IF;
  
  IF OLD.company IS DISTINCT FROM NEW.company THEN
    changes := changes || jsonb_build_object('company', jsonb_build_object('old', OLD.company, 'new', NEW.company));
    has_changes := true;
  END IF;
  
  IF OLD.value IS DISTINCT FROM NEW.value THEN
    changes := changes || jsonb_build_object('value', jsonb_build_object('old', OLD.value, 'new', NEW.value));
    has_changes := true;
  END IF;
  
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    changes := changes || jsonb_build_object('assigned_to', jsonb_build_object('old', OLD.assigned_to, 'new', NEW.assigned_to));
    has_changes := true;
  END IF;
  
  -- Se houve mudanças, registrar a atividade
  IF has_changes THEN
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'data_update',
      'Dados atualizados',
      'Informações do lead foram alteradas',
      jsonb_build_object(
        'changes', changes,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;