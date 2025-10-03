-- Corrigir recursão infinita na função sync_lead_primary_pipeline
-- Agora a função só atualiza se os valores forem realmente diferentes

CREATE OR REPLACE FUNCTION public.sync_lead_primary_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_lead RECORD;
BEGIN
  -- Quando um relacionamento é marcado como primário
  IF NEW.is_primary = true THEN
    -- Buscar valores atuais do lead
    SELECT pipeline_id, stage_id INTO current_lead
    FROM leads
    WHERE id = NEW.lead_id;
    
    -- Só atualizar se os valores forem diferentes (evita recursão)
    IF current_lead.pipeline_id IS DISTINCT FROM NEW.pipeline_id OR 
       current_lead.stage_id IS DISTINCT FROM NEW.stage_id THEN
      
      UPDATE leads
      SET pipeline_id = NEW.pipeline_id,
          stage_id = NEW.stage_id,
          updated_at = now()
      WHERE id = NEW.lead_id;
      
      RAISE NOTICE 'Lead % atualizado: pipeline % -> %, stage % -> %', 
        NEW.lead_id, current_lead.pipeline_id, NEW.pipeline_id, 
        current_lead.stage_id, NEW.stage_id;
    ELSE
      RAISE NOTICE 'Lead % já está no pipeline/stage correto, não atualizando', NEW.lead_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;