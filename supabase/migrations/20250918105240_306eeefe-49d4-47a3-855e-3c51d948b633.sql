-- Remover política existente e criar nova
DROP POLICY IF EXISTS "workspace_access_policy" ON public.workspaces;

-- Criar política RLS simples
CREATE POLICY "workspace_simple_access" 
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