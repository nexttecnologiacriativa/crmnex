-- Fix infinite recursion in RLS policies for workspaces and workspace_members

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;

-- Create new non-recursive policies for workspaces
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can view workspaces where they are members" 
ON public.workspaces 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workspace_members 
  WHERE workspace_id = workspaces.id 
  AND user_id = auth.uid()
));

-- Create new non-recursive policies for workspace_members
CREATE POLICY "Users can view their own memberships" 
ON public.workspace_members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Workspace owners can view all members" 
ON public.workspace_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workspaces 
  WHERE id = workspace_id 
  AND owner_id = auth.uid()
));

CREATE POLICY "Workspace owners can manage members" 
ON public.workspace_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.workspaces 
  WHERE id = workspace_id 
  AND owner_id = auth.uid()
));