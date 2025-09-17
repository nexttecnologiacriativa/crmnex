
-- Verificar leads órfãos e corrigi-los
-- Primeiro, vamos ver os leads que existem e seus workspaces
SELECT 
  l.id, 
  l.name, 
  l.email, 
  l.workspace_id,
  l.assigned_to,
  w.name as workspace_name
FROM leads l
LEFT JOIN workspaces w ON l.workspace_id = w.id
WHERE l.assigned_to IN (
  SELECT id FROM auth.users WHERE email = 'otaviojamesbernardes@gmail.com'
)
OR l.email = 'otaviojamesbernardes@gmail.com';

-- Atualizar os leads para o workspace correto do usuário
UPDATE leads 
SET workspace_id = (
  SELECT w.id 
  FROM workspaces w
  JOIN workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = (SELECT id FROM auth.users WHERE email = 'otaviojamesbernardes@gmail.com')
  LIMIT 1
)
WHERE (
  assigned_to = (SELECT id FROM auth.users WHERE email = 'otaviojamesbernardes@gmail.com')
  OR email = 'otaviojamesbernardes@gmail.com'
)
AND workspace_id != (
  SELECT w.id 
  FROM workspaces w
  JOIN workspace_members wm ON w.id = wm.workspace_id
  WHERE wm.user_id = (SELECT id FROM auth.users WHERE email = 'otaviojamesbernardes@gmail.com')
  LIMIT 1
);
