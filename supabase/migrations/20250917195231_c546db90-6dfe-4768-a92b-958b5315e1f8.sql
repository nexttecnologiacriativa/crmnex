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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;