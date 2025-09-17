
-- Primeiro, habilitar RLS em todas as tabelas que precisam
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes para começar limpo
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;

-- Criar políticas simples para workspaces
CREATE POLICY "workspaces_select_policy" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_insert_policy" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_policy" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

-- Políticas para workspace_members
CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "workspace_members_all_policy" ON public.workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Políticas para profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Políticas para leads
CREATE POLICY "leads_all_policy" ON public.leads
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Políticas para pipelines
CREATE POLICY "pipelines_all_policy" ON public.pipelines
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Políticas para pipeline_stages
CREATE POLICY "pipeline_stages_all_policy" ON public.pipeline_stages
  FOR ALL USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      )
    )
  );

-- Políticas para tasks
CREATE POLICY "tasks_all_policy" ON public.tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Políticas para activities
CREATE POLICY "activities_all_policy" ON public.activities
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Políticas para webhooks
CREATE POLICY "webhooks_all_policy" ON public.webhooks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );
