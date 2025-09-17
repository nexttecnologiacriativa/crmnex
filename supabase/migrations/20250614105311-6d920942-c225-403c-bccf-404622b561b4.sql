
-- Remover todas as políticas problemáticas de workspaces
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_owner_all_access" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON public.workspaces;

-- Remover políticas problemáticas de workspace_members
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_user_view" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_owner_insert" ON public.workspace_members;

-- Criar políticas simples para workspaces sem recursão
CREATE POLICY "workspaces_select_policy" 
ON public.workspaces 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "workspaces_insert_policy" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_policy" 
ON public.workspaces 
FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_policy" 
ON public.workspaces 
FOR DELETE 
USING (owner_id = auth.uid());

-- Criar políticas simples para workspace_members
CREATE POLICY "workspace_members_select_policy" 
ON public.workspace_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "workspace_members_insert_policy" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "workspace_members_update_policy" 
ON public.workspace_members 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "workspace_members_delete_policy" 
ON public.workspace_members 
FOR DELETE 
USING (user_id = auth.uid());
