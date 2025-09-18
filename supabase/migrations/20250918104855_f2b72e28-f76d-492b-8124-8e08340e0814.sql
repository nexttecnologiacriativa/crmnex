-- Remover políticas problemáticas e criar função security definer para evitar recursão infinita
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own or admin" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces they own" ON public.workspaces;

-- Criar função security definer para verificar se usuário tem acesso ao workspace
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id 
    AND w.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = workspace_id 
    AND wm.user_id = auth.uid()
  );
$$;

-- Política simples para SELECT usando a função
CREATE POLICY "Users can view their workspaces" 
ON public.workspaces 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR id IN (
    SELECT wm.workspace_id 
    FROM public.workspace_members wm 
    WHERE wm.user_id = auth.uid()
  )
);

-- Política para INSERT (apenas proprietários)
CREATE POLICY "Users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Política para UPDATE (proprietários e admins)
CREATE POLICY "Users can update their workspaces" 
ON public.workspaces 
FOR UPDATE 
USING (
  owner_id = auth.uid() 
  OR id IN (
    SELECT wm.workspace_id 
    FROM public.workspace_members wm 
    WHERE wm.user_id = auth.uid() 
    AND wm.role = 'admin'
  )
);

-- Política para DELETE (apenas proprietários)
CREATE POLICY "Users can delete their workspaces" 
ON public.workspaces 
FOR DELETE 
USING (owner_id = auth.uid());