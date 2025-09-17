
-- Remover TODAS as políticas existentes para workspaces
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;

-- Remover TODAS as políticas existentes para workspace_members
DROP POLICY IF EXISTS "Users can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members where they belong" ON public.workspace_members;

-- Agora criar as políticas corretas para workspaces
CREATE POLICY "Users can view their own workspaces"
  ON public.workspaces
  FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can view workspaces they are members of"
  ON public.workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = workspaces.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update workspaces"
  ON public.workspaces
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Verificar se a tabela workspace_members tem RLS habilitado
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Criar políticas para workspace_members
CREATE POLICY "Users can view workspace memberships"
  ON public.workspace_members
  FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Workspace owners can manage members"
  ON public.workspace_members
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Users can join workspaces"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
