-- Corrigir função que está criando pipelines duplicados
DROP FUNCTION IF EXISTS handle_new_user_with_default_workspace() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user_with_default_workspace()
RETURNS TRIGGER AS $$
DECLARE
  user_workspace_id uuid;
  user_pipeline_id uuid;
  existing_membership_count int;
BEGIN
  -- 1. Inserir o perfil do usuário primeiro
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
      RETURN NEW;
  END;

  -- 2. Verificar se o usuário foi convidado
  IF NEW.raw_user_meta_data ->> 'workspace_id' IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 3. Verificar se o usuário já tem workspace memberships (CRITICAL FIX)
  BEGIN
    SELECT COUNT(*) INTO existing_membership_count 
    FROM workspace_members 
    WHERE user_id = NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      existing_membership_count := 0;
  END;
  
  IF existing_membership_count > 0 THEN
    RETURN NEW;
  END IF;

  -- 4. Verificar se já existe workspace para este usuário (ADDITIONAL CHECK)
  SELECT id INTO user_workspace_id 
  FROM workspaces 
  WHERE owner_id = NEW.id 
  LIMIT 1;
  
  IF user_workspace_id IS NOT NULL THEN
    RETURN NEW; -- Já existe workspace, não criar outro
  END IF;

  -- 5. Criar workspace padrão APENAS se não existir
  BEGIN
    INSERT INTO workspaces (name, description, owner_id)
    VALUES ('Meu Workspace', 'Workspace pessoal', NEW.id)
    RETURNING id INTO user_workspace_id;
    
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (user_workspace_id, NEW.id, 'admin');
    
    -- Criar apenas UM pipeline padrão
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
    
    -- Criar board padrão
    INSERT INTO job_boards (workspace_id, name, description, is_default)
    VALUES (user_workspace_id, 'Board Principal', 'Board padrão para jobs', true);
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating workspace for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;