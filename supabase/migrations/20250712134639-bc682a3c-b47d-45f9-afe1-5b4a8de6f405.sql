-- Deletar pipelines duplicados de outros workspaces (mais recentes)
-- Workspace 3c058283-0844-4e6f-b4ec-fd45d4e5b658 - manter o mais antigo
UPDATE leads 
SET pipeline_id = '3ab75b59-0fdf-45da-a98a-69e7548c8d3b' 
WHERE pipeline_id = '3b39c510-6128-4e4c-befb-b25c25d9270e';

UPDATE leads 
SET stage_id = (
  SELECT ps_new.id 
  FROM pipeline_stages ps_old
  JOIN pipeline_stages ps_new ON ps_old.position = ps_new.position
  WHERE ps_old.id = leads.stage_id 
    AND ps_old.pipeline_id = '3b39c510-6128-4e4c-befb-b25c25d9270e'
    AND ps_new.pipeline_id = '3ab75b59-0fdf-45da-a98a-69e7548c8d3b'
)
WHERE stage_id IN (
  SELECT id FROM pipeline_stages WHERE pipeline_id = '3b39c510-6128-4e4c-befb-b25c25d9270e'
);

DELETE FROM pipeline_stages WHERE pipeline_id = '3b39c510-6128-4e4c-befb-b25c25d9270e';
DELETE FROM pipelines WHERE id = '3b39c510-6128-4e4c-befb-b25c25d9270e';