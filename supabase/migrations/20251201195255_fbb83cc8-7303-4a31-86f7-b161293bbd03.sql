-- Migração de dados do workspace otavio@otaviojames.com para otavio.james@next.tec.br
-- Versão com tratamento de duplicatas

DO $$
DECLARE
  origem_workspace UUID := '93f1496d-d366-4b57-8324-d470c3df8b0d';
  destino_workspace UUID := 'e15cbf15-2758-4af5-a1af-8fd3a641b778';
  destino_user UUID := '37f9b6a8-9408-4ed4-8061-1dbd7506689a';
  destino_pipeline UUID := 'fe991864-b1ee-4106-8ec3-e832a06c01f8';
BEGIN
  -- Definir o user_id temporariamente para a sessão
  PERFORM set_config('request.jwt.claims', 
    json_build_object('sub', destino_user)::text, 
    true);

  -- 1. Deletar relações antigas de pipeline que não são do novo pipeline
  DELETE FROM lead_pipeline_relations 
  WHERE lead_id IN (SELECT id FROM leads WHERE workspace_id = destino_workspace)
  AND pipeline_id != destino_pipeline;

  -- 2. Migrar Instância WhatsApp
  UPDATE whatsapp_instances 
  SET workspace_id = destino_workspace
  WHERE instance_name = 'ws_93f1496d_adriano-next';

  -- 3. Para conversas WhatsApp: deletar conversas do workspace origem que já existem no destino
  DELETE FROM whatsapp_conversations 
  WHERE workspace_id = origem_workspace
  AND phone_number IN (
    SELECT phone_number 
    FROM whatsapp_conversations 
    WHERE workspace_id = destino_workspace
  );

  -- 4. Agora migrar apenas as conversas que não existem no destino
  UPDATE whatsapp_conversations 
  SET workspace_id = destino_workspace
  WHERE workspace_id = origem_workspace;

  -- 5. Migrar Agendamentos
  UPDATE lead_appointments 
  SET workspace_id = destino_workspace
  WHERE workspace_id = origem_workspace;

  -- 6. Migrar Tasks
  UPDATE tasks 
  SET 
    workspace_id = destino_workspace,
    assigned_to = destino_user
  WHERE workspace_id = origem_workspace;

  -- 7. Migrar Activities
  UPDATE activities 
  SET 
    workspace_id = destino_workspace,
    user_id = destino_user
  WHERE workspace_id = origem_workspace;
  
  RAISE NOTICE 'Migração concluída com sucesso!';
END $$;