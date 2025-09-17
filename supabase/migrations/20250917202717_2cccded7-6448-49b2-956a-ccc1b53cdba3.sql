-- Corrigir as funções de trigger e outras funções restantes

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_debriefing_calculated_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Calcular net_revenue_calculated
  IF NEW.gross_revenue IS NOT NULL THEN
    NEW.net_revenue_calculated = NEW.gross_revenue - COALESCE(NEW.total_investment, 0);
  ELSE
    NEW.net_revenue_calculated = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_debriefing_page_rates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Calcular conversion_rate
  IF NEW.total_views > 0 THEN
    NEW.conversion_rate = (NEW.conversions::numeric / NEW.total_views::numeric) * 100;
  ELSE
    NEW.conversion_rate = 0;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_debriefing_checkout_rates()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Calcular conversion_rate
  IF NEW.total_views > 0 THEN
    NEW.conversion_rate = (NEW.completed_purchases::numeric / NEW.total_views::numeric) * 100;
  ELSE
    NEW.conversion_rate = 0;
  END IF;
  
  -- Calcular abandonment_rate
  IF NEW.checkout_starts > 0 THEN
    NEW.abandonment_rate = (NEW.checkout_abandonments::numeric / NEW.checkout_starts::numeric) * 100;
  ELSE
    NEW.abandonment_rate = 0;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_debriefing_product_revenue()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.total_revenue = NEW.unit_price * NEW.quantity_sold;
  RETURN NEW;
END;
$function$;

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