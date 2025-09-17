
-- Limpar todos os dados existentes e recriar estrutura básica
-- ATENÇÃO: Isso vai apagar TODOS os dados do sistema!

-- Deletar todos os dados das tabelas (ordem importante para respeitar foreign keys)
DELETE FROM whatsapp_messages;
DELETE FROM whatsapp_conversations;
DELETE FROM whatsapp_instances;
DELETE FROM whatsapp_templates;
DELETE FROM webhooks;
DELETE FROM tasks;
DELETE FROM lead_activities;
DELETE FROM lead_tag_relations;
DELETE FROM lead_tags;
DELETE FROM leads;
DELETE FROM pipeline_stages;
DELETE FROM pipelines;
DELETE FROM custom_fields;
DELETE FROM activities;
DELETE FROM workspace_members;
DELETE FROM workspaces;
DELETE FROM profiles;

-- Limpar usuários da tabela auth.users (cuidado: isso remove todos os usuários)
DELETE FROM auth.users;

-- Criar função para automaticamente associar novos usuários ao workspace com pipeline
CREATE OR REPLACE FUNCTION public.handle_new_user_with_default_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_workspace_id uuid;
  user_pipeline_id uuid;
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

  RETURN NEW;
END;
$$;

-- Remover trigger antigo se existir e criar novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_with_default_workspace();
