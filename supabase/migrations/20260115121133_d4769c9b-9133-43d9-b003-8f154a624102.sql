-- Fix the log_lead_data_change trigger to handle NULL auth.uid() (e.g., from Edge Functions)
CREATE OR REPLACE FUNCTION log_lead_data_change()
RETURNS TRIGGER AS $$
DECLARE
  changes jsonb := '{}';
  executing_user_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Get the executing user, with fallbacks for system/automated operations
    executing_user_id := auth.uid();
    
    IF executing_user_id IS NULL THEN
      -- Use the assigned_to field if available
      executing_user_id := COALESCE(NEW.assigned_to, OLD.assigned_to);
    END IF;
    
    IF executing_user_id IS NULL THEN
      -- Fallback to workspace owner
      SELECT owner_id INTO executing_user_id
      FROM workspaces
      WHERE id = NEW.workspace_id
      LIMIT 1;
    END IF;
    
    -- Final fallback to system UUID
    IF executing_user_id IS NULL THEN
      executing_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    -- Construir objeto de mudanças
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      changes := changes || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      changes := changes || jsonb_build_object('email', jsonb_build_object('old', OLD.email, 'new', NEW.email));
    END IF;
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      changes := changes || jsonb_build_object('phone', jsonb_build_object('old', OLD.phone, 'new', NEW.phone));
    END IF;
    IF NEW.company IS DISTINCT FROM OLD.company THEN
      changes := changes || jsonb_build_object('company', jsonb_build_object('old', OLD.company, 'new', NEW.company));
    END IF;
    IF NEW.position IS DISTINCT FROM OLD.position THEN
      changes := changes || jsonb_build_object('position', jsonb_build_object('old', OLD.position, 'new', NEW.position));
    END IF;
    IF NEW.value IS DISTINCT FROM OLD.value THEN
      changes := changes || jsonb_build_object('value', jsonb_build_object('old', OLD.value, 'new', NEW.value));
    END IF;
    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
      changes := changes || jsonb_build_object('notes', jsonb_build_object('old', LEFT(OLD.notes, 50), 'new', LEFT(NEW.notes, 50)));
    END IF;
    IF NEW.source IS DISTINCT FROM OLD.source THEN
      changes := changes || jsonb_build_object('source', jsonb_build_object('old', OLD.source, 'new', NEW.source));
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      changes := changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      changes := changes || jsonb_build_object('assigned_to', jsonb_build_object('old', OLD.assigned_to, 'new', NEW.assigned_to));
    END IF;
    IF NEW.pipeline_tag IS DISTINCT FROM OLD.pipeline_tag THEN
      changes := changes || jsonb_build_object('pipeline_tag', jsonb_build_object('old', OLD.pipeline_tag, 'new', NEW.pipeline_tag));
    END IF;
    
    -- Só registrar se houver mudanças (excluindo stage_id e pipeline_id que são tratados em outro trigger)
    IF changes != '{}' THEN
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
        'data_update',
        'Dados atualizados',
        'Informações do lead foram alteradas',
        jsonb_build_object(
          'changes', changes,
          'updated_at', now()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the log_lead_tag_change trigger for automated tagging
CREATE OR REPLACE FUNCTION log_lead_tag_change()
RETURNS TRIGGER AS $$
DECLARE
  executing_user_id uuid;
  lead_workspace_id uuid;
BEGIN
  -- Get the executing user with fallbacks
  executing_user_id := auth.uid();
  
  IF executing_user_id IS NULL THEN
    -- Get workspace_id from the lead
    IF TG_OP = 'INSERT' THEN
      SELECT workspace_id INTO lead_workspace_id FROM leads WHERE id = NEW.lead_id;
    ELSE
      SELECT workspace_id INTO lead_workspace_id FROM leads WHERE id = OLD.lead_id;
    END IF;
    
    -- Fallback to workspace owner
    IF lead_workspace_id IS NOT NULL THEN
      SELECT owner_id INTO executing_user_id
      FROM workspaces
      WHERE id = lead_workspace_id
      LIMIT 1;
    END IF;
  END IF;
  
  -- Final fallback to system UUID
  IF executing_user_id IS NULL THEN
    executing_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
    VALUES (NEW.lead_id, executing_user_id, 'tag_added', 'Tag adicionada', 'Uma nova tag foi atribuída ao lead',
      jsonb_build_object('tag_id', NEW.tag_id, 'timestamp', now()));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
    VALUES (OLD.lead_id, executing_user_id, 'tag_removed', 'Tag removida', 'Uma tag foi removida do lead',
      jsonb_build_object('tag_id', OLD.tag_id, 'timestamp', now()));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;