-- Função para reset do workspace (usada no código)
CREATE OR REPLACE FUNCTION public.reset_workspace(p_workspace_id uuid)
RETURNS void AS $$
BEGIN
  -- Verificar se o usuário tem permissão (owner do workspace)
  IF NOT EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = p_workspace_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não é o proprietário deste workspace';
  END IF;

  -- Deletar dados relacionados ao workspace (em ordem de dependência)
  DELETE FROM public.marketing_campaign_recipients WHERE campaign_id IN (SELECT id FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id);
  DELETE FROM public.campaign_recipients WHERE campaign_id IN (SELECT id FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id);
  DELETE FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id;
  DELETE FROM public.automation_executions WHERE workspace_id = p_workspace_id;
  DELETE FROM public.automation_logs WHERE workspace_id = p_workspace_id;
  DELETE FROM public.automation_queue WHERE workspace_id = p_workspace_id;
  DELETE FROM public.automation_flows WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_messages WHERE conversation_id IN (SELECT id FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id);
  DELETE FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id;
  DELETE FROM public.job_time_logs WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
  DELETE FROM public.job_comments WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
  DELETE FROM public.job_subtasks WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
  DELETE FROM public.jobs WHERE workspace_id = p_workspace_id;
  DELETE FROM public.job_boards WHERE workspace_id = p_workspace_id;
  DELETE FROM public.job_custom_statuses WHERE workspace_id = p_workspace_id;
  DELETE FROM public.debriefing_ads WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
  DELETE FROM public.debriefing_pages WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
  DELETE FROM public.debriefing_checkouts WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
  DELETE FROM public.debriefing_products WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
  DELETE FROM public.debriefings WHERE workspace_id = p_workspace_id;
  DELETE FROM public.lead_tag_relations WHERE lead_id IN (SELECT id FROM public.leads WHERE workspace_id = p_workspace_id);
  DELETE FROM public.lead_activities WHERE lead_id IN (SELECT id FROM public.leads WHERE workspace_id = p_workspace_id);
  DELETE FROM public.activities WHERE workspace_id = p_workspace_id;
  DELETE FROM public.tasks WHERE workspace_id = p_workspace_id;
  DELETE FROM public.leads WHERE workspace_id = p_workspace_id;
  DELETE FROM public.pipeline_stages WHERE pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id = p_workspace_id);
  DELETE FROM public.pipelines WHERE workspace_id = p_workspace_id;
  DELETE FROM public.lead_tags WHERE workspace_id = p_workspace_id;
  DELETE FROM public.custom_fields WHERE workspace_id = p_workspace_id;
  DELETE FROM public.webhooks WHERE workspace_id = p_workspace_id;
  DELETE FROM public.n8n_webhooks WHERE workspace_id = p_workspace_id;
  DELETE FROM public.platform_integrations WHERE workspace_id = p_workspace_id;
  DELETE FROM public.products WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_templates WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_instances WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_evolution_configs WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_official_configs WHERE workspace_id = p_workspace_id;
  DELETE FROM public.whatsapp_sync_status WHERE workspace_id = p_workspace_id;
  DELETE FROM public.marketing_settings WHERE workspace_id = p_workspace_id;
  DELETE FROM public.debriefing_settings WHERE workspace_id = p_workspace_id;
  DELETE FROM public.ai_insights_cache WHERE workspace_id = p_workspace_id;
  DELETE FROM public.workspace_limits WHERE workspace_id = p_workspace_id;
  DELETE FROM public.account_status WHERE workspace_id = p_workspace_id;
  DELETE FROM public.workspace_settings WHERE workspace_id = p_workspace_id;

  -- Recriar estrutura padrão
  PERFORM public.setup_default_workspace_data(p_workspace_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para configurar dados padrão de um workspace
CREATE OR REPLACE FUNCTION public.setup_default_workspace_data(p_workspace_id uuid)
RETURNS void AS $$
DECLARE
  pipeline_id uuid;
  stage_ids uuid[];
  board_id uuid;
BEGIN
  -- Criar pipeline padrão
  INSERT INTO public.pipelines (workspace_id, name, description, is_default)
  VALUES (p_workspace_id, 'Pipeline de Vendas', 'Pipeline padrão para gestão de leads', true)
  RETURNING id INTO pipeline_id;

  -- Criar estágios do pipeline
  WITH stages AS (
    INSERT INTO public.pipeline_stages (pipeline_id, name, color, position)
    VALUES 
      (pipeline_id, 'Novo Lead', '#3b82f6', 0),
      (pipeline_id, 'Contato Inicial', '#8b5cf6', 1),
      (pipeline_id, 'Qualificado', '#06b6d4', 2),
      (pipeline_id, 'Proposta', '#f59e0b', 3),
      (pipeline_id, 'Negociação', '#ef4444', 4),
      (pipeline_id, 'Fechado', '#10b981', 5)
    RETURNING id
  )
  SELECT array_agg(id) FROM stages INTO stage_ids;

  -- Criar job board padrão
  INSERT INTO public.job_boards (workspace_id, name, description, color, is_default)
  VALUES (p_workspace_id, 'Board Padrão', 'Board padrão para jobs', '#3b82f6', false)
  RETURNING id INTO board_id;

  -- Criar configurações do workspace
  INSERT INTO public.workspace_settings (workspace_id, default_pipeline_id)
  VALUES (p_workspace_id, pipeline_id)
  ON CONFLICT (workspace_id) DO UPDATE SET default_pipeline_id = pipeline_id;

  -- Criar configurações de marketing padrão
  INSERT INTO public.marketing_settings (workspace_id, default_api_type, evolution_message_interval, max_messages_per_minute)
  VALUES (p_workspace_id, 'whatsapp_official', 2, 30)
  ON CONFLICT (workspace_id) DO NOTHING;

  -- Criar configurações de debriefing padrão
  INSERT INTO public.debriefing_settings (workspace_id, fixed_cost, tax_percentage)
  VALUES (p_workspace_id, 0, 0)
  ON CONFLICT DO NOTHING;

  -- Criar status da conta
  INSERT INTO public.account_status (workspace_id, is_active)
  VALUES (p_workspace_id, true)
  ON CONFLICT (workspace_id) DO NOTHING;

  -- Criar tags padrão
  INSERT INTO public.lead_tags (workspace_id, name, color)
  VALUES 
    (p_workspace_id, 'Quente', '#ef4444'),
    (p_workspace_id, 'Morno', '#f59e0b'),
    (p_workspace_id, 'Frio', '#06b6d4'),
    (p_workspace_id, 'Qualificado', '#10b981'),
    (p_workspace_id, 'Interessado', '#8b5cf6')
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para verificar e criar dados padrão após criar workspace
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar dados padrão para o novo workspace
  PERFORM public.setup_default_workspace_data(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar dados padrão automaticamente
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- Habilitar realtime para algumas tabelas importantes
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- Publicar para realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_queue;