
-- Habilitar RLS nas tabelas que ainda não têm
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Políticas para jobs
DROP POLICY IF EXISTS "Users can view jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can create jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can update jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete jobs in their workspace" ON public.jobs;

CREATE POLICY "Users can view jobs in their workspace" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = jobs.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create jobs in their workspace" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = jobs.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update jobs in their workspace" ON public.jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = jobs.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete jobs in their workspace" ON public.jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = jobs.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Políticas para workspace_members
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON public.workspace_members;

CREATE POLICY "Users can view workspace members" ON public.workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage members" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('admin', 'manager')
    )
  );

-- Políticas para profiles (para permitir visualização de membros)
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

-- Políticas para workspaces
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;

CREATE POLICY "Users can view their workspaces" ON public.workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
      AND wm.user_id = auth.uid()
    )
  );
