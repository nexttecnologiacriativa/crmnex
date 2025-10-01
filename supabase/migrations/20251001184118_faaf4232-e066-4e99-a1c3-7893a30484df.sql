-- Criar função para registrar mudanças de estágio automaticamente
CREATE OR REPLACE FUNCTION log_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o estágio mudou, registrar a atividade
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.pipeline_id IS DISTINCT FROM NEW.pipeline_id THEN
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

-- Criar trigger para mudanças de estágio
DROP TRIGGER IF EXISTS lead_stage_change_trigger ON leads;
CREATE TRIGGER lead_stage_change_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.pipeline_id IS DISTINCT FROM NEW.pipeline_id)
  EXECUTE FUNCTION log_lead_stage_change();

-- Criar função para registrar mudanças de dados do lead
CREATE OR REPLACE FUNCTION log_lead_data_change()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb := '{}'::jsonb;
  has_changes boolean := false;
BEGIN
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

-- Criar trigger para mudanças de dados
DROP TRIGGER IF EXISTS lead_data_change_trigger ON leads;
CREATE TRIGGER lead_data_change_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_data_change();

-- Criar função para registrar adição/remoção de tags
CREATE OR REPLACE FUNCTION log_lead_tag_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.lead_id,
      auth.uid(),
      'tag_added',
      'Tag adicionada',
      'Uma nova tag foi atribuída ao lead',
      jsonb_build_object(
        'tag_id', NEW.tag_id,
        'timestamp', now()
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      OLD.lead_id,
      auth.uid(),
      'tag_removed',
      'Tag removida',
      'Uma tag foi removida do lead',
      jsonb_build_object(
        'tag_id', OLD.tag_id,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar triggers para tags
DROP TRIGGER IF EXISTS lead_tag_added_trigger ON lead_tag_relations;
CREATE TRIGGER lead_tag_added_trigger
  AFTER INSERT ON lead_tag_relations
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_tag_change();

DROP TRIGGER IF EXISTS lead_tag_removed_trigger ON lead_tag_relations;
CREATE TRIGGER lead_tag_removed_trigger
  AFTER DELETE ON lead_tag_relations
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_tag_change();

-- Criar função para registrar criação de tarefas
CREATE OR REPLACE FUNCTION log_task_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.lead_id,
      auth.uid(),
      'task_created',
      'Tarefa criada',
      NEW.title,
      jsonb_build_object(
        'task_id', NEW.id,
        'due_date', NEW.due_date,
        'priority', NEW.priority,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para criação de tarefas
DROP TRIGGER IF EXISTS task_creation_trigger ON tasks;
CREATE TRIGGER task_creation_trigger
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION log_task_creation();

-- Criar função para registrar conclusão de tarefas
CREATE OR REPLACE FUNCTION log_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO lead_activities (
      lead_id,
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.lead_id,
      auth.uid(),
      'task_completed',
      'Tarefa concluída',
      NEW.title,
      jsonb_build_object(
        'task_id', NEW.id,
        'completed_at', NEW.completed_at,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para conclusão de tarefas
DROP TRIGGER IF EXISTS task_completion_trigger ON tasks;
CREATE TRIGGER task_completion_trigger
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.lead_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION log_task_completion();