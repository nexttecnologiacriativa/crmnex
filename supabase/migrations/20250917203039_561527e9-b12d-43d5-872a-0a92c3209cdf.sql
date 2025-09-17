-- Verificar e corrigir as políticas RLS para workspaces para que membros possam ver os workspaces

-- Primeiro, vamos ver se há policies para workspaces
-- Vou criar uma policy que permite membros verem workspaces onde são membros

CREATE POLICY IF NOT EXISTS "Users can view workspaces they own or are members of" 
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
CREATE POLICY IF NOT EXISTS "Users can create workspaces" 
ON public.workspaces 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Política para atualizar workspaces (proprietários e admins)
CREATE POLICY IF NOT EXISTS "Users can update workspaces they own or admin" 
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
CREATE POLICY IF NOT EXISTS "Users can delete workspaces they own" 
ON public.workspaces 
FOR DELETE 
USING (owner_id = auth.uid());