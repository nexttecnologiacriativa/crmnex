-- Migrar os 10 leads restantes do workspace origem
DO $$
DECLARE
  destino_workspace UUID := 'e15cbf15-2758-4af5-a1af-8fd3a641b778';
  destino_user UUID := '37f9b6a8-9408-4ed4-8061-1dbd7506689a';
  destino_pipeline UUID := 'fe991864-b1ee-4106-8ec3-e832a06c01f8';
  destino_stage UUID := 'a7f30192-c84e-4a5b-8409-f9e4385e662c';
BEGIN
  -- Definir o user_id temporariamente para a sessão
  PERFORM set_config('request.jwt.claims', 
    json_build_object('sub', destino_user)::text, 
    true);

  -- Migrar os 10 leads restantes
  UPDATE leads 
  SET 
    workspace_id = destino_workspace,
    pipeline_id = destino_pipeline,
    stage_id = destino_stage,
    assigned_to = destino_user
  WHERE workspace_id = '93f1496d-d366-4b57-8324-d470c3df8b0d';
  
  -- Deletar relações antigas de pipeline
  DELETE FROM lead_pipeline_relations 
  WHERE lead_id IN (
    SELECT id FROM leads WHERE workspace_id = destino_workspace
  )
  AND pipeline_id != destino_pipeline;
  
  RAISE NOTICE '10 leads migrados com sucesso!';
END $$;