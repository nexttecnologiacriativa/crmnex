-- Corrigir as últimas funções restantes

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

CREATE OR REPLACE FUNCTION public.get_workspace_usage(p_workspace_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_leads', (SELECT COUNT(*) FROM public.leads WHERE workspace_id = p_workspace_id),
    'total_tasks', (SELECT COUNT(*) FROM public.tasks WHERE workspace_id = p_workspace_id),
    'total_jobs', (SELECT COUNT(*) FROM public.jobs WHERE workspace_id = p_workspace_id),
    'total_campaigns', (SELECT COUNT(*) FROM public.marketing_campaigns WHERE workspace_id = p_workspace_id),
    'total_conversations', (SELECT COUNT(*) FROM public.whatsapp_conversations WHERE workspace_id = p_workspace_id)
  ) INTO result;
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_member_to_workspace(p_workspace_id uuid, p_user_email text, p_role text DEFAULT 'member'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  target_user UUID;
  result JSON;
BEGIN
  -- Find user by email
  SELECT au.id INTO target_user
  FROM auth.users au
  WHERE au.email = p_user_email;
  
  IF target_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = target_user) THEN
    RETURN json_build_object('success', false, 'error', 'User is already a member');
  END IF;
  
  -- Add user to workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, target_user, p_role);
  
  RETURN json_build_object('success', true, 'user_id', target_user);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_scheduler_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_campaigns', (SELECT COUNT(*) FROM public.marketing_campaigns WHERE status = 'active'),
    'scheduled_campaigns', (SELECT COUNT(*) FROM public.marketing_campaigns WHERE status = 'scheduled'),
    'sent_today', (SELECT COUNT(*) FROM public.marketing_campaigns WHERE status = 'sent' AND DATE(updated_at) = CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$function$;