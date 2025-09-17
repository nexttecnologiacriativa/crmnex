
-- Adicionar políticas completas para todas as operações nas tabelas
-- Primeiro, adicionar políticas para INSERT, UPDATE, DELETE em workspace_members
CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

-- Adicionar políticas completas para workspaces
CREATE POLICY "workspaces_member_insert" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_member_update" ON public.workspaces
  FOR UPDATE USING (
    id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "workspaces_member_delete" ON public.workspaces
  FOR DELETE USING (
    id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

-- Garantir que o board padrão existe para workspaces existentes
INSERT INTO public.job_boards (workspace_id, name, description, color, is_default)
SELECT id, 'Board Padrão', 'Board padrão para jobs', '#3b82f6', true
FROM public.workspaces
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_boards 
  WHERE workspace_id = workspaces.id AND is_default = true
)
ON CONFLICT DO NOTHING;
