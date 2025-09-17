-- Remove ALL existing RLS policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces where they are members" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can view all members" ON public.workspace_members;  
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;

-- Create simple, non-recursive policies for workspaces
CREATE POLICY "Allow owners to access their workspaces"
ON public.workspaces
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Create simple, non-recursive policies for workspace_members  
CREATE POLICY "Allow users to manage their memberships"
ON public.workspace_members
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Allow workspace owners to manage all members"
ON public.workspace_members  
FOR ALL
USING (auth.uid() IN (
  SELECT owner_id FROM public.workspaces 
  WHERE id = workspace_id
));

-- Update user_has_workspace_access function to be non-recursive
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;