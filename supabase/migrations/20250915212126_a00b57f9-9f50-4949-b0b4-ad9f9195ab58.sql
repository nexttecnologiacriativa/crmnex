-- Create trigger function to enqueue automation when a tag is applied to a lead
CREATE OR REPLACE FUNCTION public.trigger_tag_applied_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert an automation queue item for tag_applied with workspace context
  INSERT INTO public.automation_queue (
    workspace_id,
    trigger_type,
    lead_id,
    trigger_data,
    created_at,
    status
  )
  SELECT l.workspace_id,
         'tag_applied',
         NEW.lead_id,
         jsonb_build_object(
           'lead_id', NEW.lead_id,
           'tag_id', NEW.tag_id,
           'workspace_id', l.workspace_id
         ),
         now(),
         'pending'
  FROM public.leads l
  WHERE l.id = NEW.lead_id;

  RETURN NEW;
END;
$$;

-- Attach AFTER INSERT trigger on lead_tag_relations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_automation_on_tag_relation_insert'
  ) THEN
    CREATE TRIGGER trg_automation_on_tag_relation_insert
    AFTER INSERT ON public.lead_tag_relations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_tag_applied_automation();
  END IF;
END;
$$;

-- Attach AFTER INSERT trigger on leads to enqueue lead_created
-- Uses existing function public.trigger_lead_automation()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_automation_on_lead_insert'
  ) THEN
    CREATE TRIGGER trg_automation_on_lead_insert
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_lead_automation();
  END IF;
END;
$$;

-- Attach AFTER UPDATE trigger on leads to enqueue pipeline_stage_changed when stage changes
-- Uses existing function public.notify_pipeline_stage_changed()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_pipeline_stage_changed'
  ) THEN
    CREATE TRIGGER trg_notify_pipeline_stage_changed
    AFTER UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_pipeline_stage_changed();
  END IF;
END;
$$;