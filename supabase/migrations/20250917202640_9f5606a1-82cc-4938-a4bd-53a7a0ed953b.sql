-- Corrigir as demais funções com search_path mutable

CREATE OR REPLACE FUNCTION public.handle_new_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Criar dados padrão para o novo workspace
  PERFORM public.setup_default_workspace_data(NEW.id);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Check if user is the workspace owner
  IF EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_uuid 
    AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is a member
  IF EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_workspace(p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;