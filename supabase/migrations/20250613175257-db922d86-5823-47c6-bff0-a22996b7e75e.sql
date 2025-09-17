
-- Remover TODAS as políticas existentes de workspace_members
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete workspace members" ON public.workspace_members;

-- Criar função security definer para verificar se o usuário pertence ao workspace
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
$$;

-- Criar função security definer para verificar se o usuário é admin/manager do workspace
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin_or_manager(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$$;

-- Recriar políticas usando as funções security definer
CREATE POLICY "Users can view workspace members of their workspaces" 
ON public.workspace_members 
FOR SELECT 
USING (public.user_is_workspace_member(workspace_id));

CREATE POLICY "Users can insert themselves as workspace members" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and managers can insert workspace members" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (public.user_is_workspace_admin_or_manager(workspace_id));

CREATE POLICY "Admins and managers can update workspace members" 
ON public.workspace_members 
FOR UPDATE 
USING (public.user_is_workspace_admin_or_manager(workspace_id));

CREATE POLICY "Admins and managers can delete workspace members" 
ON public.workspace_members 
FOR DELETE 
USING (public.user_is_workspace_admin_or_manager(workspace_id));
