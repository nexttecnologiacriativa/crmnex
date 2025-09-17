
-- Criar função security definer para evitar recursão infinita
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS TABLE(workspace_id UUID)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT wm.workspace_id 
  FROM public.workspace_members wm 
  WHERE wm.user_id = auth.uid();
$$;

-- Remover todas as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "workspace_members_view_same_workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "workspaces_member_access" ON public.workspaces;
DROP POLICY IF EXISTS "jobs_workspace_member_access" ON public.jobs;
DROP POLICY IF EXISTS "job_boards_workspace_member_access" ON public.job_boards;

-- Recriar políticas usando a função security definer
CREATE POLICY "workspace_members_view_members" ON public.workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "workspaces_member_select" ON public.workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "jobs_workspace_access" ON public.jobs
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "job_boards_workspace_access" ON public.job_boards
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );
