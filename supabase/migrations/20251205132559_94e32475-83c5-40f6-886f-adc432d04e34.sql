-- 1. Criar função para verificar se usuário é admin ou owner do workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Verifica se é owner do workspace
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND owner_id = auth.uid()
  )
  OR EXISTS (
    -- Verifica se é admin do workspace
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid 
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 2. Remover políticas antigas de workspace_members
DROP POLICY IF EXISTS "Allow users to manage their memberships" ON workspace_members;
DROP POLICY IF EXISTS "Allow workspace owners to manage all members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can delete workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can leave workspace" ON workspace_members;

-- 3. Criar novas políticas RLS para workspace_members

-- Membros podem ver todos os membros do mesmo workspace
CREATE POLICY "Members can view workspace members"
ON workspace_members FOR SELECT
USING (user_has_workspace_access(workspace_id));

-- Admins/Owners podem inserir membros
CREATE POLICY "Admins can insert workspace members"
ON workspace_members FOR INSERT
WITH CHECK (is_workspace_admin_or_owner(workspace_id));

-- Admins/Owners podem atualizar membros (exceto a si mesmos)
CREATE POLICY "Admins can update workspace members"
ON workspace_members FOR UPDATE
USING (is_workspace_admin_or_owner(workspace_id) AND user_id != auth.uid());

-- Admins/Owners podem deletar membros (exceto a si mesmos)
CREATE POLICY "Admins can delete other workspace members"
ON workspace_members FOR DELETE
USING (is_workspace_admin_or_owner(workspace_id) AND user_id != auth.uid());

-- Usuários podem sair do workspace (deletar próprio registro)
CREATE POLICY "Users can leave workspace"
ON workspace_members FOR DELETE
USING (user_id = auth.uid());

-- 4. Atualizar função add_member_to_workspace com verificação de permissão
CREATE OR REPLACE FUNCTION public.add_member_to_workspace(p_workspace_id uuid, p_user_email text, p_role text DEFAULT 'user'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
  result JSON;
BEGIN
  -- Verificar se quem chama é admin ou owner do workspace
  IF NOT is_workspace_admin_or_owner(p_workspace_id) THEN
    RETURN json_build_object('success', false, 'error', 'Você não tem permissão para adicionar membros');
  END IF;

  -- Find user by email
  SELECT au.id INTO target_user
  FROM auth.users au
  WHERE au.email = p_user_email;
  
  IF target_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = p_workspace_id AND user_id = target_user) THEN
    RETURN json_build_object('success', false, 'error', 'Usuário já é membro do workspace');
  END IF;
  
  -- Add user to workspace with proper type casting
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, target_user, p_role::user_role);
  
  RETURN json_build_object('success', true, 'user_id', target_user);
END;
$$;