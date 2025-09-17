
-- Esta migração ajusta o fluxo de criação de novos usuários para diferenciar
-- entre usuários orgânicos e usuários convidados. Usuários convidados não
-- receberão mais um workspace pessoal padrão, sendo direcionados para o
-- workspace ao qual foram convidados.

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
  ON CONFLICT (id) DO NOTHING; -- Evita erro se o perfil já existir

  -- 2. Verificar se o usuário foi convidado.
  -- A informação do convite é passada via 'data' no método de convite do Supabase.
  IF NEW.raw_user_meta_data ->> 'workspace_id' IS NOT NULL THEN
    -- Se foi convidado, o trabalho do trigger termina aqui.
    -- O hook 'useInviteAcceptance' no frontend cuidará de adicionar o usuário ao workspace correto.
    RAISE NOTICE '[Auth Trigger] User % was invited. Skipping default workspace creation.', NEW.id;
    RETURN NEW;
  END IF;

  -- 3. Se não foi convidado (inscrição orgânica), criar um workspace pessoal padrão.
  RAISE NOTICE '[Auth Trigger] User % is organic. Creating default workspace.', NEW.id;
  BEGIN
    INSERT INTO workspaces (name, description, owner_id)
    VALUES ('Meu Workspace', 'Workspace pessoal', NEW.id)
    RETURNING id INTO user_workspace_id;
    
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (user_workspace_id, NEW.id, 'admin');
    
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
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[Auth Trigger] Failed to create default workspace for user %: %', NEW.id, SQLERRM;
      -- O perfil já foi criado, então o usuário pode continuar, mas sem workspace.
  END;

  RETURN NEW;
END;
$$;
