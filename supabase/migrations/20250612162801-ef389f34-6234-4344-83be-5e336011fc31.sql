
-- Habilitar RLS na tabela workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que podem estar causando recursão
DROP POLICY IF EXISTS "Users can view their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;

-- Política para visualizar workspaces (usuário é dono)
CREATE POLICY "Users can view their own workspaces" 
ON public.workspaces 
FOR SELECT 
USING (owner_id = auth.uid());

-- Política para criar workspaces
CREATE POLICY "Users can create their own workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Política para atualizar workspaces (usuário é dono)
CREATE POLICY "Users can update their own workspaces" 
ON public.workspaces 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Política para deletar workspaces (usuário é dono)
CREATE POLICY "Users can delete their own workspaces" 
ON public.workspaces 
FOR DELETE 
USING (owner_id = auth.uid());

-- Também corrigir políticas para workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can create workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_all_policy" ON public.workspace_members;

-- Usuários podem ver memberships de workspaces que possuem
CREATE POLICY "Users can view workspace memberships" 
ON public.workspace_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_members.workspace_id 
    AND owner_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Usuários podem criar memberships para workspaces que possuem
CREATE POLICY "Users can create workspace memberships" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_members.workspace_id 
    AND owner_id = auth.uid()
  )
);
