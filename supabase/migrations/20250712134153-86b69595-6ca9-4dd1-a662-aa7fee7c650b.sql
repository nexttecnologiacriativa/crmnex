-- Primeiro, vou mover os leads do pipeline duplicado para o pipeline principal
UPDATE leads 
SET pipeline_id = '4400bb0a-5811-4150-ac07-1d76f3b71888' 
WHERE pipeline_id = '3428e5f8-6fba-4d59-b82e-5be91a2b86c2';

-- Atualizar os estágios do pipeline duplicado para o pipeline principal
UPDATE leads 
SET stage_id = (
  SELECT ps_new.id 
  FROM pipeline_stages ps_old
  JOIN pipeline_stages ps_new ON ps_old.position = ps_new.position
  WHERE ps_old.id = leads.stage_id 
    AND ps_old.pipeline_id = '3428e5f8-6fba-4d59-b82e-5be91a2b86c2'
    AND ps_new.pipeline_id = '4400bb0a-5811-4150-ac07-1d76f3b71888'
)
WHERE stage_id IN (
  SELECT id FROM pipeline_stages WHERE pipeline_id = '3428e5f8-6fba-4d59-b82e-5be91a2b86c2'
);

-- Deletar os estágios do pipeline duplicado
DELETE FROM pipeline_stages 
WHERE pipeline_id = '3428e5f8-6fba-4d59-b82e-5be91a2b86c2';

-- Deletar o pipeline duplicado
DELETE FROM pipelines 
WHERE id = '3428e5f8-6fba-4d59-b82e-5be91a2b86c2';