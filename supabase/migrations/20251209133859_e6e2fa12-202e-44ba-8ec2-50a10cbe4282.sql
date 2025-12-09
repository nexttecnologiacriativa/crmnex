-- Update user_has_workspace_access to allow super admins to see all workspaces
CREATE OR REPLACE FUNCTION user_has_workspace_access(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = auth.uid()
  )
  OR is_super_admin(auth.uid());
$$;