-- Corrigir a função add_member_to_workspace para usar o tipo correto

CREATE OR REPLACE FUNCTION public.add_member_to_workspace(p_workspace_id uuid, p_user_email text, p_role text DEFAULT 'user'::text)
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
  
  -- Add user to workspace with proper type casting
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, target_user, p_role::user_role);
  
  RETURN json_build_object('success', true, 'user_id', target_user);
END;
$function$;