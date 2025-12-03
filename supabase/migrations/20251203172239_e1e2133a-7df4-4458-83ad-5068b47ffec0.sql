
-- Passo 1: Remover as 7 instâncias extras do workspace Next Tecnologia Criativa
DELETE FROM whatsapp_instances 
WHERE workspace_id = 'e15cbf15-2758-4af5-a1af-8fd3a641b778'
  AND instance_name NOT IN ('ws_e15cbf15_comercial', 'ws_e15cbf15_adriano-next');

-- Passo 2: Associar os 4 usuários restantes às 2 instâncias corretas
-- (Otavio James já tem acesso)
INSERT INTO user_whatsapp_instances (user_id, instance_id)
VALUES
  -- Bruno Ferreira -> Comercial Charles
  ('ba99ff51-bb85-44ce-a326-c52223f1ae2b', '1e5df6c4-3bcf-4ad2-b5c3-91ae1fbcf8d4'),
  -- Bruno Ferreira -> Comercial Adriano
  ('ba99ff51-bb85-44ce-a326-c52223f1ae2b', '1387d5ab-2aec-4439-b786-691755b0d504'),
  -- Charles Michel Simões -> Comercial Charles
  ('74828cd5-af8c-4cdb-8e28-7029ed584d77', '1e5df6c4-3bcf-4ad2-b5c3-91ae1fbcf8d4'),
  -- Charles Michel Simões -> Comercial Adriano
  ('74828cd5-af8c-4cdb-8e28-7029ed584d77', '1387d5ab-2aec-4439-b786-691755b0d504'),
  -- João Pedro -> Comercial Charles
  ('bd75ba3e-b92b-4dde-8b43-9f290cb3ec63', '1e5df6c4-3bcf-4ad2-b5c3-91ae1fbcf8d4'),
  -- João Pedro -> Comercial Adriano
  ('bd75ba3e-b92b-4dde-8b43-9f290cb3ec63', '1387d5ab-2aec-4439-b786-691755b0d504'),
  -- Allan Stanley -> Comercial Charles
  ('da151ea7-6eab-474a-bdde-fc530209445d', '1e5df6c4-3bcf-4ad2-b5c3-91ae1fbcf8d4'),
  -- Allan Stanley -> Comercial Adriano
  ('da151ea7-6eab-474a-bdde-fc530209445d', '1387d5ab-2aec-4439-b786-691755b0d504')
ON CONFLICT DO NOTHING;
