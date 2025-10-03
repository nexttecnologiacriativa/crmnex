-- Passo 1: Criar registros em lead_pipeline_relations para todos os leads existentes que não têm essa relação
INSERT INTO lead_pipeline_relations (lead_id, pipeline_id, stage_id, is_primary)
SELECT 
  id as lead_id,
  pipeline_id,
  stage_id,
  true as is_primary
FROM leads
WHERE id NOT IN (SELECT lead_id FROM lead_pipeline_relations)
  AND pipeline_id IS NOT NULL
  AND stage_id IS NOT NULL;

-- Passo 2: Criar função para automaticamente criar relação quando um lead é inserido
CREATE OR REPLACE FUNCTION create_lead_pipeline_relation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pipeline_id IS NOT NULL AND NEW.stage_id IS NOT NULL THEN
    INSERT INTO lead_pipeline_relations (lead_id, pipeline_id, stage_id, is_primary)
    VALUES (NEW.id, NEW.pipeline_id, NEW.stage_id, true)
    ON CONFLICT (lead_id, pipeline_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Passo 3: Criar trigger que executa a função após inserir um lead
DROP TRIGGER IF EXISTS trigger_create_lead_pipeline_relation ON leads;
CREATE TRIGGER trigger_create_lead_pipeline_relation
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION create_lead_pipeline_relation();