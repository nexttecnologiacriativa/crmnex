
CREATE OR REPLACE FUNCTION public.reset_workspace(p_workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin boolean;
  user_pipeline_id uuid;
BEGIN
  -- 1. Verifica se o usuário é um administrador do workspace
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Permissão negada: Você precisa ser um administrador para zerar o workspace.';
  END IF;

  -- 2. Deleta os dados em uma ordem que respeita as chaves estrangeiras
  -- Deleta os filhos antes dos pais para evitar erros de restrição

  -- Atividades de Leads e Relações de Tags
  DELETE FROM public.lead_activities WHERE lead_id IN (SELECT id FROM public.leads WHERE workspace_id = p_workspace_id);
  DELETE FROM public.lead_tag_relations WHERE lead_id IN (SELECT id FROM public.leads WHERE workspace_id = p_workspace_id);

  -- Tarefas
  DELETE FROM public.tasks WHERE workspace_id = p_workspace_id;

  -- Itens relacionados a Jobs
  DELETE FROM public.job_comments WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
  DELETE FROM public.job_subtasks WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
  DELETE FROM public.job_time_logs WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
  
  -- Jobs
  DELETE FROM public.jobs WHERE workspace_id = p_workspace_id;
  DELETE FROM public.job_boards WHERE workspace_id = p_workspace_id;

  -- Leads (agora que suas dependências foram removidas)
  DELETE FROM public.leads WHERE workspace_id = p_workspace_id;

  -- Itens de Pipeline
  DELETE FROM public.pipeline_stages WHERE pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id = p_workspace_id);
  DELETE FROM public.pipelines WHERE workspace_id = p_workspace_id;
  
  -- Outros dados do workspace
  DELETE FROM public.custom_fields WHERE workspace_id = p_workspace_id;
  DELETE FROM public.webhooks WHERE workspace_id = p_workspace_id;
  DELETE FROM public.activities WHERE workspace_id = p_workspace_id;

  -- Dados do WhatsApp
  DELETE FROM public.whatsapp_messages WHERE conversation_id IN (SELECT id FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id);
  DELETE FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_instances WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_templates WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_official_configs WHERE workspace_id = p_workspace_id;
  
  -- 3. Recria a pipeline e os estágios padrão
  INSERT INTO public.pipelines (workspace_id, name, description, is_default)
  VALUES (p_workspace_id, 'Pipeline de Vendas', 'Pipeline padrão para gestão de leads', true)
  RETURNING id INTO user_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, color, position) VALUES
    (user_pipeline_id, 'Novo Lead', '#3b82f6', 0),
    (user_pipeline_id, 'Contato Inicial', '#8b5cf6', 1),
    (user_pipeline_id, 'Qualificado', '#06b6d4', 2),
    (user_pipeline_id, 'Proposta', '#f59e0b', 3),
    (user_pipeline_id, 'Negociação', '#ef4444', 4),
    (user_pipeline_id, 'Fechado', '#10b981', 5);
        
END;
$$;
