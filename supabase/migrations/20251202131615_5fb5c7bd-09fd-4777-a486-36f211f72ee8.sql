-- Migrar instâncias antigas para o novo formato de prefixo
-- Workspace: e15cbf15-2758-4af5-a1af-8fd3a641b778 (Next Tecnologia Criativa)

UPDATE whatsapp_instances 
SET 
  instance_name = CONCAT('ws_e15cbf15_', instance_name),
  instance_key = CONCAT('ws_e15cbf15_', instance_key),
  updated_at = now()
WHERE workspace_id = 'e15cbf15-2758-4af5-a1af-8fd3a641b778'
  AND NOT instance_name LIKE 'ws_e15cbf15_%';