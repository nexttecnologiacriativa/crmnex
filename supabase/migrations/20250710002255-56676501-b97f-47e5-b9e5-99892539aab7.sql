-- 1. Corrigir membros duplicados removendo duplicatas antigas
WITH duplicates AS (
  SELECT user_id, workspace_id, MIN(joined_at) as keep_date
  FROM workspace_members
  GROUP BY user_id, workspace_id
  HAVING COUNT(*) > 1
)
DELETE FROM workspace_members wm
WHERE EXISTS (
  SELECT 1 FROM duplicates d
  WHERE d.user_id = wm.user_id 
  AND d.workspace_id = wm.workspace_id 
  AND (wm.joined_at > d.keep_date OR (wm.joined_at = d.keep_date AND wm.id NOT IN (
    SELECT MIN(id) FROM workspace_members wm2
    WHERE wm2.user_id = d.user_id AND wm2.workspace_id = d.workspace_id AND wm2.joined_at = d.keep_date
  )))
);

-- 2. Remover job boards duplicados, mantendo apenas o mais recente
WITH board_duplicates AS (
  SELECT workspace_id, name, MAX(created_at) as keep_date
  FROM job_boards
  GROUP BY workspace_id, name
  HAVING COUNT(*) > 1
)
DELETE FROM job_boards jb
WHERE EXISTS (
  SELECT 1 FROM board_duplicates bd
  WHERE bd.workspace_id = jb.workspace_id 
  AND bd.name = jb.name 
  AND jb.created_at < bd.keep_date
);

-- 3. Marcar apenas um board como padrão por workspace
UPDATE job_boards 
SET is_default = false 
WHERE id NOT IN (
  SELECT DISTINCT ON (workspace_id) id
  FROM job_boards
  WHERE is_default = true
  ORDER BY workspace_id, created_at ASC
);

-- 4. Garantir que cada workspace tenha pelo menos um board padrão
UPDATE job_boards
SET is_default = true
WHERE id IN (
  SELECT DISTINCT ON (workspace_id) id
  FROM job_boards jb1
  WHERE NOT EXISTS (
    SELECT 1 FROM job_boards jb2 
    WHERE jb2.workspace_id = jb1.workspace_id 
    AND jb2.is_default = true
  )
  ORDER BY workspace_id, created_at ASC
);

-- 5. Adicionar workspace_id às lead_tags se ainda não existir
ALTER TABLE lead_tags ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 6. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_lead_tags_workspace_id ON lead_tags(workspace_id);

-- 7. Atualizar políticas RLS das lead_tags para serem específicas por workspace
DROP POLICY IF EXISTS "Anyone can view lead tags" ON lead_tags;
DROP POLICY IF EXISTS "Authenticated users can create lead tags" ON lead_tags;
DROP POLICY IF EXISTS "Authenticated users can delete lead tags" ON lead_tags;
DROP POLICY IF EXISTS "Authenticated users can update lead tags" ON lead_tags;
DROP POLICY IF EXISTS "Users can create tags" ON lead_tags;
DROP POLICY IF EXISTS "Users can view all tags" ON lead_tags;

-- Novas políticas específicas por workspace
CREATE POLICY "Users can view tags in their workspace" ON lead_tags
  FOR SELECT USING (workspace_id IS NULL OR user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can create tags in their workspace" ON lead_tags
  FOR INSERT WITH CHECK (workspace_id IS NULL OR user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can update tags in their workspace" ON lead_tags
  FOR UPDATE USING (workspace_id IS NULL OR user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can delete tags in their workspace" ON lead_tags
  FOR DELETE USING (workspace_id IS NULL OR user_belongs_to_workspace(workspace_id));

-- 8. Migrar tags existentes para serem globais (workspace_id = NULL) temporariamente
UPDATE lead_tags SET workspace_id = NULL WHERE workspace_id IS NULL;

-- 9. Adicionar constraint única para evitar membros duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_unique 
ON workspace_members(workspace_id, user_id);

-- 10. Corrigir a função de criação de usuário para evitar duplicações
CREATE OR REPLACE FUNCTION public.handle_new_user_with_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_workspace_id uuid;
  user_pipeline_id uuid;
BEGIN
  -- 1. Inserir o perfil do usuário. Isso acontece para todos os novos usuários.
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- 2. Verificar se o usuário foi convidado.
  IF NEW.raw_user_meta_data ->> 'workspace_id' IS NOT NULL THEN
    RAISE NOTICE '[Auth Trigger] User % was invited. Skipping default workspace creation.', NEW.id;
    RETURN NEW;
  END IF;

  -- 3. Se não foi convidado, criar workspace apenas se não existir
  RAISE NOTICE '[Auth Trigger] User % is organic. Creating default workspace.', NEW.id;
  BEGIN
    -- Verificar se já existe um workspace para este usuário
    SELECT id INTO user_workspace_id FROM workspaces WHERE owner_id = NEW.id LIMIT 1;
    
    IF user_workspace_id IS NULL THEN
      INSERT INTO workspaces (name, description, owner_id)
      VALUES ('Meu Workspace', 'Workspace pessoal', NEW.id)
      RETURNING id INTO user_workspace_id;
      
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (user_workspace_id, NEW.id, 'admin')
      ON CONFLICT (workspace_id, user_id) DO NOTHING;
      
      -- Verificar se já existe pipeline padrão
      SELECT id INTO user_pipeline_id FROM pipelines WHERE workspace_id = user_workspace_id AND is_default = true LIMIT 1;
      
      IF user_pipeline_id IS NULL THEN
        INSERT INTO pipelines (workspace_id, name, description, is_default)
        VALUES (user_workspace_id, 'Pipeline de Vendas', 'Pipeline padrão para gestão de leads', true)
        RETURNING id INTO user_pipeline_id;
        
        INSERT INTO pipeline_stages (pipeline_id, name, color, position) VALUES
        (user_pipeline_id, 'Novo Lead', '#3b82f6', 0),
        (user_pipeline_id, 'Contato Inicial', '#8b5cf6', 1),
        (user_pipeline_id, 'Qualificado', '#06b6d4', 2),
        (user_pipeline_id, 'Proposta', '#f59e0b', 3),
        (user_pipeline_id, 'Negociação', '#ef4444', 4),
        (user_pipeline_id, 'Fechado', '#10b981', 5);
      END IF;
      
      -- Criar board padrão apenas se não existir
      INSERT INTO job_boards (workspace_id, name, description, is_default)
      SELECT user_workspace_id, 'Board Principal', 'Board padrão para jobs', true
      WHERE NOT EXISTS (
        SELECT 1 FROM job_boards WHERE workspace_id = user_workspace_id
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[Auth Trigger] Failed to create default workspace for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;