
-- Desabilitar RLS temporariamente para fazer correções
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_boards DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can create jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can update jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete jobs in their workspace" ON public.jobs;
DROP POLICY IF EXISTS "Users can view job boards in their workspace" ON public.job_boards;
DROP POLICY IF EXISTS "Users can create job boards in their workspace" ON public.job_boards;
DROP POLICY IF EXISTS "Users can update job boards in their workspace" ON public.job_boards;
DROP POLICY IF EXISTS "Users can delete job boards in their workspace" ON public.job_boards;

-- Reabilitar RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_boards ENABLE ROW LEVEL SECURITY;

-- Políticas simples para workspace_members (sem recursão)
CREATE POLICY "workspace_members_own_access" ON public.workspace_members
  FOR ALL USING (user_id = auth.uid());

-- Políticas simples para workspaces (apenas owners)
CREATE POLICY "workspaces_owner_access" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid());

-- Políticas simples para profiles
CREATE POLICY "profiles_own_access" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT USING (true);

-- Políticas para jobs (verificação direta de owner do workspace)
CREATE POLICY "jobs_workspace_owner_access" ON public.jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = jobs.workspace_id AND w.owner_id = auth.uid()
    )
  );

-- Políticas para job_boards (verificação direta de owner do workspace)
CREATE POLICY "job_boards_workspace_owner_access" ON public.job_boards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = job_boards.workspace_id AND w.owner_id = auth.uid()
    )
  );
