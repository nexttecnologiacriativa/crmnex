-- Remover políticas existentes e criar novas para workspaces

-- Remover políticas existentes se existirem
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own or admin" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces they own" ON public.workspaces;

-- Criar política para visualizar workspaces (proprietários e membros)
CREATE POLICY "Users can view workspaces they own or are members of" 
ON public.workspaces 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspaces.id 
    AND wm.user_id = auth.uid()
  )
);

-- Política para inserir workspaces (apenas proprietários)
CREATE POLICY "Users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Política para atualizar workspaces (proprietários e admins)
CREATE POLICY "Users can update workspaces they own or admin" 
ON public.workspaces 
FOR UPDATE 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspaces.id 
    AND wm.user_id = auth.uid() 
    AND wm.role = 'admin'
  )
);

-- Política para deletar workspaces (apenas proprietários)
CREATE POLICY "Users can delete workspaces they own" 
ON public.workspaces 
FOR DELETE 
USING (owner_id = auth.uid());