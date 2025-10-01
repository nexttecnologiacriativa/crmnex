-- Função para sincronizar leads com seus pipelines primários
CREATE OR REPLACE FUNCTION sync_lead_pipeline_relations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_record RECORD;
BEGIN
  -- Para cada lead, criar relacionamento se não existir
  FOR lead_record IN 
    SELECT id, pipeline_id, stage_id, workspace_id 
    FROM leads 
    WHERE pipeline_id IS NOT NULL
  LOOP
    -- Inserir relacionamento se não existir
    INSERT INTO lead_pipeline_relations (lead_id, pipeline_id, stage_id, is_primary)
    VALUES (lead_record.id, lead_record.pipeline_id, lead_record.stage_id, true)
    ON CONFLICT DO NOTHING;
    
    -- Garantir que apenas um relacionamento é primário
    UPDATE lead_pipeline_relations
    SET is_primary = false
    WHERE lead_id = lead_record.id
      AND pipeline_id != lead_record.pipeline_id;
      
    UPDATE lead_pipeline_relations
    SET is_primary = true
    WHERE lead_id = lead_record.id
      AND pipeline_id = lead_record.pipeline_id;
  END LOOP;
  
  -- Sincronizar leads.pipeline_id com o pipeline primário
  UPDATE leads l
  SET pipeline_id = lpr.pipeline_id,
      stage_id = lpr.stage_id
  FROM lead_pipeline_relations lpr
  WHERE l.id = lpr.lead_id
    AND lpr.is_primary = true
    AND (l.pipeline_id != lpr.pipeline_id OR l.stage_id != lpr.stage_id);
END;
$$;

-- Executar a sincronização
SELECT sync_lead_pipeline_relations();

-- Criar trigger para manter sincronização automática
CREATE OR REPLACE FUNCTION sync_lead_primary_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando um relacionamento é marcado como primário, atualizar a tabela leads
  IF NEW.is_primary = true THEN
    UPDATE leads
    SET pipeline_id = NEW.pipeline_id,
        stage_id = NEW.stage_id,
        updated_at = now()
    WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_lead_primary_pipeline ON lead_pipeline_relations;
CREATE TRIGGER trigger_sync_lead_primary_pipeline
  AFTER INSERT OR UPDATE OF is_primary, stage_id
  ON lead_pipeline_relations
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION sync_lead_primary_pipeline();