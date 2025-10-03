-- Função para sincronizar relações de leads de um workspace específico
CREATE OR REPLACE FUNCTION public.sync_workspace_lead_relations(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir relações faltantes apenas para o workspace especificado
  INSERT INTO lead_pipeline_relations (lead_id, pipeline_id, stage_id, is_primary)
  SELECT 
    l.id,
    l.pipeline_id,
    l.stage_id,
    true
  FROM leads l
  WHERE l.workspace_id = p_workspace_id
    AND l.pipeline_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM lead_pipeline_relations lpr
      WHERE lpr.lead_id = l.id
        AND lpr.pipeline_id = l.pipeline_id
    );
END;
$$;

-- Função para garantir que todo lead tenha uma relação ao ser criado/atualizado
CREATE OR REPLACE FUNCTION public.ensure_lead_pipeline_relation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pipeline_id IS NOT NULL THEN
    INSERT INTO lead_pipeline_relations (lead_id, pipeline_id, stage_id, is_primary)
    VALUES (NEW.id, NEW.pipeline_id, NEW.stage_id, true)
    ON CONFLICT (lead_id, pipeline_id) DO UPDATE
    SET stage_id = EXCLUDED.stage_id,
        updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para garantir relação ao inserir lead
DROP TRIGGER IF EXISTS ensure_lead_relation_after_insert ON leads;
CREATE TRIGGER ensure_lead_relation_after_insert
AFTER INSERT OR UPDATE OF pipeline_id, stage_id ON leads
FOR EACH ROW
EXECUTE FUNCTION public.ensure_lead_pipeline_relation();