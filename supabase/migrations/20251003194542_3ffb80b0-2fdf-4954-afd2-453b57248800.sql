-- Corrigir função log_lead_tag_change para verificar se lead existe antes de inserir atividade
CREATE OR REPLACE FUNCTION log_lead_tag_change()
RETURNS TRIGGER AS $$
DECLARE
  lead_exists boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    -- Verificar se o lead ainda existe antes de inserir atividade
    IF TG_OP = 'DELETE' THEN
      SELECT EXISTS(SELECT 1 FROM leads WHERE id = OLD.lead_id) INTO lead_exists;
      IF NOT lead_exists THEN
        -- Lead está sendo deletado, não registrar atividade
        RETURN OLD;
      END IF;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
      VALUES (NEW.lead_id, auth.uid(), 'tag_added', 'Tag adicionada', 'Uma nova tag foi atribuída ao lead',
        jsonb_build_object('tag_id', NEW.tag_id, 'timestamp', now()));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description, metadata)
      VALUES (OLD.lead_id, auth.uid(), 'tag_removed', 'Tag removida', 'Uma tag foi removida do lead',
        jsonb_build_object('tag_id', OLD.tag_id, 'timestamp', now()));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;