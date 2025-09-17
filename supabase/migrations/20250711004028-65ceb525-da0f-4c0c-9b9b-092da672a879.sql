-- Corrigir problemas identificados

-- 1. Remover duplicação do usuário taywme.ribeiro3@gmail.com
-- O usuário tem dois workspaces duplicados, vamos manter apenas um e transferir os dados

-- Primeiro, vamos transferir todos os leads do workspace duplicado para o workspace principal
UPDATE leads 
SET workspace_id = '74f92174-bd03-461a-a54b-edceeeb5bbf0'
WHERE workspace_id = '02fa4506-018f-409d-bb14-20163b1d3395';

-- Transferir outros dados se existirem
UPDATE pipelines 
SET workspace_id = '74f92174-bd03-461a-a54b-edceeeb5bbf0'
WHERE workspace_id = '02fa4506-018f-409d-bb14-20163b1d3395';

UPDATE jobs 
SET workspace_id = '74f92174-bd03-461a-a54b-edceeeb5bbf0'
WHERE workspace_id = '02fa4506-018f-409d-bb14-20163b1d3395';

UPDATE tasks 
SET workspace_id = '74f92174-bd03-461a-a54b-edceeeb5bbf0'
WHERE workspace_id = '02fa4506-018f-409d-bb14-20163b1d3395';

-- Remover o workspace membro duplicado
DELETE FROM workspace_members 
WHERE workspace_id = '02fa4506-018f-409d-bb14-20163b1d3395' 
AND user_id = 'adcab78c-9609-4936-8bfe-b56ed0ee5852';

-- Remover o workspace duplicado
DELETE FROM workspaces 
WHERE id = '02fa4506-018f-409d-bb14-20163b1d3395';

-- 2. Corrigir as tags para que sejam vinculadas ao workspace
-- Atualizar todas as tags existentes com workspace_id NULL para o workspace principal
UPDATE lead_tags 
SET workspace_id = '74f92174-bd03-461a-a54b-edceeeb5bbf0'
WHERE workspace_id IS NULL;

-- 3. Corrigir a query no useJobs para usar .maybeSingle() em vez de .single()
-- Isso será feito no código React

-- 4. Garantir que cada usuário tenha apenas um workspace padrão
-- Adicionar constraint para evitar duplicações futuras
ALTER TABLE workspace_members 
ADD CONSTRAINT unique_user_workspace_pair 
UNIQUE (user_id, workspace_id);

-- 5. Corrigir função handle_new_user_with_default_workspace para evitar duplicações
CREATE OR REPLACE FUNCTION public.handle_new_user_with_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_workspace_id uuid;
  user_pipeline_id uuid;
  existing_membership_count int;
BEGIN
  -- 1. Inserir o perfil do usuário
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  -- 2. Verificar se o usuário foi convidado
  IF NEW.raw_user_meta_data ->> 'workspace_id' IS NOT NULL THEN
    RAISE NOTICE '[Auth Trigger] User % was invited. Skipping default workspace creation.', NEW.id;
    RETURN NEW;
  END IF;

  -- 3. Verificar se o usuário já tem workspace memberships
  SELECT COUNT(*) INTO existing_membership_count 
  FROM workspace_members 
  WHERE user_id = NEW.id;
  
  IF existing_membership_count > 0 THEN
    RAISE NOTICE '[Auth Trigger] User % already has workspace memberships. Skipping default workspace creation.', NEW.id;
    RETURN NEW;
  END IF;

  -- 4. Se não foi convidado e não tem memberships, criar workspace padrão
  RAISE NOTICE '[Auth Trigger] User % is organic. Creating default workspace.', NEW.id;
  BEGIN
    INSERT INTO workspaces (name, description, owner_id)
    VALUES ('Meu Workspace', 'Workspace pessoal', NEW.id)
    RETURNING id INTO user_workspace_id;
    
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (user_workspace_id, NEW.id, 'admin');
    
    -- Criar pipeline padrão
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
    
    RAISE NOTICE '[Auth Trigger] Created workspace % for user %', user_workspace_id, NEW.id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE WARNING '[Auth Trigger] Unique violation when creating workspace for user %', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING '[Auth Trigger] Failed to create default workspace for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;