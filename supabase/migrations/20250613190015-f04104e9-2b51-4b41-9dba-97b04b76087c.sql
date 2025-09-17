
-- Primeiro, vamos garantir que o trigger antigo seja removido
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_with_default_workspace();

-- Criar função melhorada para lidar com novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_with_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_workspace_id uuid;
  user_pipeline_id uuid;
BEGIN
  -- Verificar se as tabelas necessárias existem
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspaces') THEN
    RAISE NOTICE 'Tabela workspaces não existe, pulando criação de workspace';
    -- Apenas inserir o perfil
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    );
    RETURN NEW;
  END IF;

  -- Inserir perfil do usuário
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );

  -- Criar workspace pessoal para o usuário
  INSERT INTO workspaces (name, description, owner_id)
  VALUES ('Meu Workspace', 'Workspace pessoal', NEW.id)
  RETURNING id INTO user_workspace_id;
  
  -- Adicionar usuário como admin do seu workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (user_workspace_id, NEW.id, 'admin');
  
  -- Criar pipeline padrão para o novo workspace
  INSERT INTO pipelines (workspace_id, name, description, is_default)
  VALUES (user_workspace_id, 'Pipeline de Vendas', 'Pipeline padrão para gestão de leads', true)
  RETURNING id INTO user_pipeline_id;
  
  -- Criar estágios padrão
  INSERT INTO pipeline_stages (pipeline_id, name, color, position) VALUES
  (user_pipeline_id, 'Novo Lead', '#3b82f6', 0),
  (user_pipeline_id, 'Contato Inicial', '#8b5cf6', 1),
  (user_pipeline_id, 'Qualificado', '#06b6d4', 2),
  (user_pipeline_id, 'Proposta', '#f59e0b', 3),
  (user_pipeline_id, 'Negociação', '#ef4444', 4),
  (user_pipeline_id, 'Fechado', '#10b981', 5);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se algo der errado, apenas log o erro e continue
    RAISE NOTICE 'Erro ao criar workspace para usuário %: %', NEW.id, SQLERRM;
    -- Tentar inserir apenas o perfil
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Criar o trigger novamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_with_default_workspace();
