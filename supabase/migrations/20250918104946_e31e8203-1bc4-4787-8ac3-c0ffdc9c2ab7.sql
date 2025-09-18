-- Remover função existente e políticas problemáticas
DROP FUNCTION IF EXISTS public.user_has_workspace_access(uuid);
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update workspaces they own or admin" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete workspaces they own" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their workspaces" ON public.workspaces;

-- Criar função security definer corrigida para verificar acesso ao workspace
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é owner do workspace
  IF EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Verificar se o usuário é membro do workspace
  IF EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_id 
    AND user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Políticas RLS simplificadas para evitar recursão
CREATE POLICY "workspace_select_policy" 
ON public.workspaces FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspaces.id 
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace_insert_policy" 
ON public.workspaces FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_update_policy" 
ON public.workspaces FOR UPDATE 
USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspaces.id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'owner')
  )
);

CREATE POLICY "workspace_delete_policy" 
ON public.workspaces FOR DELETE 
USING (owner_id = auth.uid());