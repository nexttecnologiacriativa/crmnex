
-- Continuar corrigindo as políticas para workspaces e jobs

-- Remover política restritiva de workspaces
DROP POLICY IF EXISTS "workspaces_owner_access" ON public.workspaces;

-- Criar políticas para workspaces que permitem acesso aos membros
CREATE POLICY "workspaces_member_access" ON public.workspaces
  FOR SELECT USING (
    id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_owner_full_access" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid());

-- Remover política restritiva de jobs
DROP POLICY IF EXISTS "jobs_workspace_owner_access" ON public.jobs;

-- Criar política para jobs que permite acesso aos membros do workspace
CREATE POLICY "jobs_workspace_member_access" ON public.jobs
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );

-- Remover política restritiva de job_boards
DROP POLICY IF EXISTS "job_boards_workspace_owner_access" ON public.job_boards;

-- Criar política para job_boards que permite acesso aos membros do workspace
CREATE POLICY "job_boards_workspace_member_access" ON public.job_boards
  FOR ALL USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );
