
-- Desabilitar RLS temporariamente para fazer limpeza completa
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes de workspaces (incluindo variações)
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_owner_all_access" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;

-- Remover TODAS as políticas existentes de workspace_members
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_user_view" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_owner_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;

-- Reabilitar RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Criar políticas muito simples e diretas (sem JOIN ou subqueries complexas)
CREATE POLICY "workspace_owner_access" 
ON public.workspaces 
FOR ALL 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Política para workspace_members - apenas o próprio usuário pode ver suas memberships
CREATE POLICY "member_own_access" 
ON public.workspace_members 
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
