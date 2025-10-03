-- Remover a política genérica atual que bloqueia criação
DROP POLICY IF EXISTS "workspace_access" ON public.workspaces;

-- Política para CRIAR workspace (apenas seu próprio)
CREATE POLICY "Users can create their own workspaces"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Política para ACESSAR workspaces (apenas se for membro)
CREATE POLICY "Users can access workspaces they are members of"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (user_has_workspace_access(id));

-- Política para ATUALIZAR workspaces (apenas se for membro)
CREATE POLICY "Users can update workspaces they are members of"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (user_has_workspace_access(id))
  WITH CHECK (user_has_workspace_access(id));

-- Política para DELETAR workspaces (apenas owner)
CREATE POLICY "Owners can delete their workspaces"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);