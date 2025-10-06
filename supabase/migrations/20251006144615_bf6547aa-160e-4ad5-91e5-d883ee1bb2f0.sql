-- Fix function search path for trigger_lead_automation
CREATE OR REPLACE FUNCTION trigger_lead_automation()
RETURNS trigger AS $$
BEGIN
  -- Insert into automation queue for lead created
  IF (TG_OP = 'INSERT' AND TG_TABLE_NAME = 'leads') THEN
    INSERT INTO automation_queue (workspace_id, lead_id, trigger_type, trigger_data, status)
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'lead_created',
      jsonb_build_object('lead_id', NEW.id, 'workspace_id', NEW.workspace_id),
      'pending'
    );
  END IF;
  
  -- Insert into automation queue for tag added
  IF (TG_OP = 'INSERT' AND TG_TABLE_NAME = 'lead_tag_relations') THEN
    INSERT INTO automation_queue (workspace_id, lead_id, trigger_type, trigger_data, status)
    VALUES (
      (SELECT workspace_id FROM leads WHERE id = NEW.lead_id),
      NEW.lead_id,
      'tag_added',
      jsonb_build_object('lead_id', NEW.lead_id, 'tag_id', NEW.tag_id),
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;