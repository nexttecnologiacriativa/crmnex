
-- Remover o usuário icandaybr@gmail.com da base de dados
-- Primeiro, vamos fazer isso de forma mais direta

-- Remover workspace_members
DELETE FROM public.workspace_members 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover lead_activities
DELETE FROM public.lead_activities 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover activities
DELETE FROM public.activities 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover tasks
DELETE FROM public.tasks 
WHERE created_by = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com') 
   OR assigned_to = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover jobs
DELETE FROM public.jobs 
WHERE created_by = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com') 
   OR assigned_to = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover leads
DELETE FROM public.leads 
WHERE assigned_to = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover whatsapp_messages
DELETE FROM public.whatsapp_messages 
WHERE sent_by = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover whatsapp_templates
DELETE FROM public.whatsapp_templates 
WHERE created_by = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover workspace_limits
DELETE FROM public.workspace_limits 
WHERE created_by = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover account_status
DELETE FROM public.account_status 
WHERE suspended_by = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Remover workspaces onde o usuário é owner
DELETE FROM public.workspaces 
WHERE owner_id = (SELECT id FROM public.profiles WHERE email = 'icandaybr@gmail.com');

-- Finalmente, remover o perfil do usuário
DELETE FROM public.profiles WHERE email = 'icandaybr@gmail.com';

-- Corrigir a função para garantir que a pipeline padrão seja criada
CREATE OR REPLACE FUNCTION public.handle_new_user_with_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_workspace_id uuid;
  user_pipeline_id uuid;
  user_board_id uuid;
BEGIN
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

  -- Criar job board padrão
  INSERT INTO job_boards (workspace_id, name, description, color, is_default)
  VALUES (user_workspace_id, 'Board Padrão', 'Board padrão para jobs', '#3b82f6', false)
  RETURNING id INTO user_board_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se algo der errado, log o erro mas continue
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
