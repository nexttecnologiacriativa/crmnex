-- Remover apenas as políticas problemáticas da tabela workspaces
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;  
DROP POLICY IF EXISTS "Users can update workspaces they own or admin" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_delete_policy" ON public.workspaces;

-- Criar políticas simples para workspaces sem causar recursão
CREATE POLICY "workspace_owners_can_view" 
ON public.workspaces FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "workspace_members_can_view" 
ON public.workspaces FOR SELECT 
USING (
  id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "users_can_create_workspaces" 
ON public.workspaces FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_owners_can_update" 
ON public.workspaces FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "workspace_admins_can_update" 
ON public.workspaces FOR UPDATE 
USING (
  id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "workspace_owners_can_delete" 
ON public.workspaces FOR DELETE 
USING (owner_id = auth.uid());