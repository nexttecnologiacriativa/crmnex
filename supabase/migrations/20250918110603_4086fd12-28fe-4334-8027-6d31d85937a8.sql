-- Remover o workspace duplicado "Next Tecnologia" e todos os dados associados
-- Isso vai automaticamente remover todos os dados relacionados devido às foreign keys

-- 1. Primeiro remover o membro do workspace duplicado
DELETE FROM workspace_members 
WHERE workspace_id = '12f5d11c-8b38-4c87-82ce-6beb0a9d2c94';

-- 2. Depois remover o workspace duplicado
-- Isso vai cascatear e remover automaticamente:
-- - leads, tasks, pipelines, pipeline_stages, etc. deste workspace
DELETE FROM workspaces 
WHERE id = '12f5d11c-8b38-4c87-82ce-6beb0a9d2c94';