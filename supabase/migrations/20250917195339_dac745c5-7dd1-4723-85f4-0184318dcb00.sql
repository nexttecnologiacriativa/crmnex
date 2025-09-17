-- Função para resetar workspace (limpar todos os dados)
CREATE OR REPLACE FUNCTION public.reset_workspace(p_workspace_id uuid)
RETURNS void AS $$
DECLARE
    workspace_exists boolean;
    user_has_permission boolean;
BEGIN
    -- Verificar se o workspace existe
    SELECT EXISTS(SELECT 1 FROM public.workspaces WHERE id = p_workspace_id) INTO workspace_exists;
    
    IF NOT workspace_exists THEN
        RAISE EXCEPTION 'Workspace não encontrado';
    END IF;
    
    -- Verificar se o usuário tem permissão (é owner ou admin do workspace)
    SELECT EXISTS(
        SELECT 1 FROM public.workspaces w 
        WHERE w.id = p_workspace_id 
        AND (
            w.owner_id = auth.uid() 
            OR EXISTS(
                SELECT 1 FROM public.workspace_members wm 
                WHERE wm.workspace_id = p_workspace_id 
                AND wm.user_id = auth.uid() 
                AND wm.role = 'admin'
            )
        )
    ) INTO user_has_permission;
    
    IF NOT user_has_permission THEN
        RAISE EXCEPTION 'Permissão negada para resetar este workspace';
    END IF;
    
    -- Limpar dados em ordem (respeitando foreign keys)
    DELETE FROM public.lead_tag_relations WHERE lead_id IN (SELECT id FROM public.leads WHERE workspace_id = p_workspace_id);
    DELETE FROM public.lead_activities WHERE lead_id IN (SELECT id FROM public.leads WHERE workspace_id = p_workspace_id);
    DELETE FROM public.whatsapp_messages WHERE conversation_id IN (SELECT id FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id);
    DELETE FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id;
    DELETE FROM public.automation_logs WHERE workspace_id = p_workspace_id;
    DELETE FROM public.automation_executions WHERE workspace_id = p_workspace_id;
    DELETE FROM public.automation_queue WHERE workspace_id = p_workspace_id;
    DELETE FROM public.campaign_recipients WHERE campaign_id IN (SELECT id FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id);
    DELETE FROM public.marketing_campaign_recipients WHERE campaign_id IN (SELECT id FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id);
    DELETE FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id;
    DELETE FROM public.debriefing_ads WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
    DELETE FROM public.debriefing_pages WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
    DELETE FROM public.debriefing_checkouts WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
    DELETE FROM public.debriefing_products WHERE debriefing_id IN (SELECT id FROM public.debriefings WHERE workspace_id = p_workspace_id);
    DELETE FROM public.debriefings WHERE workspace_id = p_workspace_id;
    DELETE FROM public.job_comments WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
    DELETE FROM public.job_subtasks WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
    DELETE FROM public.job_time_logs WHERE job_id IN (SELECT id FROM public.jobs WHERE workspace_id = p_workspace_id);
    DELETE FROM public.jobs WHERE workspace_id = p_workspace_id;
    DELETE FROM public.tasks WHERE workspace_id = p_workspace_id;
    DELETE FROM public.activities WHERE workspace_id = p_workspace_id;
    DELETE FROM public.leads WHERE workspace_id = p_workspace_id;
    DELETE FROM public.lead_tags WHERE workspace_id = p_workspace_id;
    DELETE FROM public.custom_fields WHERE workspace_id = p_workspace_id;
    DELETE FROM public.pipeline_stages WHERE pipeline_id IN (SELECT id FROM public.pipelines WHERE workspace_id = p_workspace_id);
    DELETE FROM public.pipelines WHERE workspace_id = p_workspace_id;
    DELETE FROM public.job_boards WHERE workspace_id = p_workspace_id;
    DELETE FROM public.job_custom_statuses WHERE workspace_id = p_workspace_id;
    DELETE FROM public.automation_flows WHERE workspace_id = p_workspace_id;
    DELETE FROM public.webhooks WHERE workspace_id = p_workspace_id;
    DELETE FROM public.n8n_webhooks WHERE workspace_id = p_workspace_id;
    DELETE FROM public.platform_integrations WHERE workspace_id = p_workspace_id;
    DELETE FROM public.whatsapp_instances WHERE workspace_id = p_workspace_id;
    DELETE FROM public.whatsapp_templates WHERE workspace_id = p_workspace_id;
    DELETE FROM public.whatsapp_sync_status WHERE workspace_id = p_workspace_id;
    DELETE FROM public.products WHERE workspace_id = p_workspace_id;
    DELETE FROM public.ai_insights_cache WHERE workspace_id = p_workspace_id;
    DELETE FROM public.marketing_settings WHERE workspace_id = p_workspace_id;
    DELETE FROM public.whatsapp_evolution_configs WHERE workspace_id = p_workspace_id;
    DELETE FROM public.whatsapp_official_configs WHERE workspace_id = p_workspace_id;
    DELETE FROM public.debriefing_settings WHERE workspace_id = p_workspace_id;
    DELETE FROM public.workspace_settings WHERE workspace_id = p_workspace_id;
    DELETE FROM public.workspace_limits WHERE workspace_id = p_workspace_id;
    DELETE FROM public.account_status WHERE workspace_id = p_workspace_id;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para obter estatísticas do workspace
CREATE OR REPLACE FUNCTION public.get_workspace_stats(p_workspace_id uuid)
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
    total_leads integer;
    total_tasks integer;
    total_jobs integer;
    total_pipelines integer;
    active_campaigns integer;
BEGIN
    -- Verificar acesso
    IF NOT public.user_has_workspace_access(p_workspace_id) THEN
        RAISE EXCEPTION 'Acesso negado ao workspace';
    END IF;
    
    -- Contar leads
    SELECT COUNT(*) INTO total_leads FROM public.leads WHERE workspace_id = p_workspace_id;
    
    -- Contar tasks
    SELECT COUNT(*) INTO total_tasks FROM public.tasks WHERE workspace_id = p_workspace_id;
    
    -- Contar jobs
    SELECT COUNT(*) INTO total_jobs FROM public.jobs WHERE workspace_id = p_workspace_id;
    
    -- Contar pipelines
    SELECT COUNT(*) INTO total_pipelines FROM public.pipelines WHERE workspace_id = p_workspace_id;
    
    -- Contar campanhas ativas
    SELECT COUNT(*) INTO active_campaigns 
    FROM public.marketing_campaigns 
    WHERE workspace_id = p_workspace_id 
    AND status IN ('scheduled', 'sending');
    
    -- Montar JSON com estatísticas
    stats = jsonb_build_object(
        'total_leads', total_leads,
        'total_tasks', total_tasks,
        'total_jobs', total_jobs,
        'total_pipelines', total_pipelines,
        'active_campaigns', active_campaigns,
        'last_updated', now()
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Triggers para atualizar updated_at automaticamente (apenas se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_workspaces_updated_at') THEN
        CREATE TRIGGER update_workspaces_updated_at 
            BEFORE UPDATE ON public.workspaces 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_leads_updated_at') THEN
        CREATE TRIGGER update_leads_updated_at 
            BEFORE UPDATE ON public.leads 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_tasks_updated_at') THEN
        CREATE TRIGGER update_tasks_updated_at 
            BEFORE UPDATE ON public.tasks 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_jobs_updated_at') THEN
        CREATE TRIGGER update_jobs_updated_at 
            BEFORE UPDATE ON public.jobs 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_job_boards_updated_at') THEN
        CREATE TRIGGER update_job_boards_updated_at 
            BEFORE UPDATE ON public.job_boards 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_pipelines_updated_at') THEN
        CREATE TRIGGER update_pipelines_updated_at 
            BEFORE UPDATE ON public.pipelines 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_automation_flows_updated_at') THEN
        CREATE TRIGGER update_automation_flows_updated_at 
            BEFORE UPDATE ON public.automation_flows 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_marketing_campaigns_updated_at') THEN
        CREATE TRIGGER update_marketing_campaigns_updated_at 
            BEFORE UPDATE ON public.marketing_campaigns 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Índices adicionais importantes (apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_queue_status ON public.automation_queue(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp);