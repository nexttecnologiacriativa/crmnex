-- Corrigir as demais funções restantes

CREATE OR REPLACE FUNCTION public.get_workspace_stats(p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  -- Check if user exists in workspace_members as workspace admin for workspace with id starting with 'super'
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspace_members wm 
    JOIN public.workspaces w ON wm.workspace_id = w.id 
    WHERE wm.user_id = $1 
    AND wm.role = 'admin' 
    AND w.id::text LIKE 'super%'
  );
END;
$function$;