-- Recriar a função user_has_workspace_access caso não exista ou esteja com problema
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = auth.uid()
  );
$$;