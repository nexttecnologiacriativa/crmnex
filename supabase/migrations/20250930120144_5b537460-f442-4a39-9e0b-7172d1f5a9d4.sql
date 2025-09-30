-- Criar workspace para o usuário específico que não tem workspace
DO $$
DECLARE
  user_id UUID := '201841a0-a943-40df-9505-d84252cd08ab';
  workspace_id UUID;
BEGIN
  -- Verificar se o usuário já tem workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces WHERE owner_id = user_id
  ) THEN
    -- Criar workspace
    INSERT INTO workspaces (name, description, owner_id)
    VALUES ('Meu Workspace', 'Workspace padrão', user_id)
    RETURNING id INTO workspace_id;
    
    -- Adicionar como membro admin
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (workspace_id, user_id, 'admin');
    
    -- Chamar função para configurar dados padrão
    PERFORM setup_default_workspace_data(workspace_id);
  END IF;
END $$;