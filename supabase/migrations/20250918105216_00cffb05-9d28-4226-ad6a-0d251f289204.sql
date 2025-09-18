-- Desabilitar RLS temporariamente na tabela workspaces para resolver recursão
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas da tabela workspaces
DROP POLICY IF EXISTS "workspace_owners_can_view" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_members_can_view" ON public.workspaces;
DROP POLICY IF EXISTS "users_can_create_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_owners_can_update" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_admins_can_update" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_owners_can_delete" ON public.workspaces;
DROP POLICY IF EXISTS "simple_workspace_access" ON public.workspaces;

-- Reabilitar RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Criar política RLS simples corrigida
CREATE POLICY "workspace_access_policy" 
ON public.workspaces FOR ALL 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspaces.id 
    AND user_id = auth.uid()
  )
) 
WITH CHECK (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspaces.id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);