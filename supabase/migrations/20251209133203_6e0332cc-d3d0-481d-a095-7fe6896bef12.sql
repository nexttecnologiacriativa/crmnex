
-- Criar workspace de super admin com UUID válido (hex only, starts with 'super' substituído por hex)
INSERT INTO workspaces (id, name, owner_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid, 
  'superadmin', 
  '37f9b6a8-9408-4ed4-8061-1dbd7506689a'::uuid
)
ON CONFLICT (id) DO NOTHING;

-- Adicionar usuário como admin do workspace super admin
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '37f9b6a8-9408-4ed4-8061-1dbd7506689a'::uuid,
  'admin'::user_role
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;
