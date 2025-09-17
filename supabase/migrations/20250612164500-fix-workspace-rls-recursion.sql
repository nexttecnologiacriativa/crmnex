
-- Primeiro, desabilitar RLS temporariamente para workspaces e workspace_members
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Remover apenas as políticas problemáticas de workspaces
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;

-- Remover políticas de workspace_members
DROP POLICY IF EXISTS "Users can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members where they belong" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_all_policy" ON public.workspace_members;

-- Reabilitar RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Criar políticas simples e diretas para workspaces (sem funções)
CREATE POLICY "workspaces_owner_all_access" 
ON public.workspaces 
FOR ALL 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Política para workspace_members - só membros podem ver suas associações
CREATE POLICY "workspace_members_user_view" 
ON public.workspace_members 
FOR SELECT 
USING (user_id = auth.uid());

-- Política para workspace_members - só donos podem inserir membros
CREATE POLICY "workspace_members_owner_insert" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);
