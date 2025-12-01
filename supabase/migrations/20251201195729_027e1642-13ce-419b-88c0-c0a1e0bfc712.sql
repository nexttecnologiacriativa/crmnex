-- Atualizar o nome da instância do WhatsApp para o novo workspace
UPDATE whatsapp_instances 
SET 
  instance_name = 'ws_e15cbf15_adriano-next',
  instance_key = 'ws_e15cbf15_adriano-next',
  updated_at = now()
WHERE id = '6a15b92e-4e95-483a-b894-456f4c689c69'
  AND workspace_id = 'e15cbf15-2758-4af5-a1af-8fd3a641b778';