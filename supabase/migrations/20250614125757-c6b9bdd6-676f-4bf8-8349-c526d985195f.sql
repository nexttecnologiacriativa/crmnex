
-- Abordagem mais simples para evitar deadlocks
-- Remover políticas uma de cada vez e recriar

-- Primeiro, remover política problemática de workspace_members
DROP POLICY IF EXISTS "workspace_members_own_access" ON public.workspace_members;

-- Criar nova política para workspace_members que permite ver membros do mesmo workspace
CREATE POLICY "workspace_members_view_same_workspace" ON public.workspace_members
  FOR SELECT USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );

-- Política para gerenciar próprios registros
CREATE POLICY "workspace_members_manage_own" ON public.workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "workspace_members_update_own" ON public.workspace_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "workspace_members_delete_own" ON public.workspace_members
  FOR DELETE USING (user_id = auth.uid());
