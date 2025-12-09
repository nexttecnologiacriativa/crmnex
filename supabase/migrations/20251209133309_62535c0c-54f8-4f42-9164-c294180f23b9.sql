
-- Atualizar função is_super_admin para verificar pelo nome do workspace ao invés do ID
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspace_members wm 
    JOIN public.workspaces w ON wm.workspace_id = w.id 
    WHERE wm.user_id = $1 
    AND wm.role = 'admin' 
    AND (w.id::text LIKE 'super%' OR w.name ILIKE '%superadmin%')
  );
END;
$function$;
