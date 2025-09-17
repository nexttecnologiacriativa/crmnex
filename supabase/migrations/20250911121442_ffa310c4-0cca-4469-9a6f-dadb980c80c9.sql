-- Função para adicionar membro ao workspace e criar perfil se necessário
CREATE OR REPLACE FUNCTION public.add_member_to_workspace(
  p_workspace_id uuid,
  p_user_email text,
  p_user_id uuid,
  p_role user_role
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_member_count int;
  result json;
BEGIN
  -- Verificar se o usuário atual é admin ou manager do workspace
  IF NOT user_is_workspace_admin_or_manager(p_workspace_id) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Você não tem permissão para adicionar membros a este workspace'
    );
  END IF;

  -- Verificar se já é membro
  SELECT COUNT(*) INTO existing_member_count
  FROM workspace_members
  WHERE workspace_id = p_workspace_id 
    AND user_id = p_user_id;

  IF existing_member_count > 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Este usuário já é membro do workspace'
    );
  END IF;

  -- Criar perfil se não existir (com SECURITY DEFINER, ignora RLS)
  INSERT INTO profiles (id, email, full_name)
  VALUES (p_user_id, p_user_email, p_user_email)
  ON CONFLICT (id) DO NOTHING;

  -- Adicionar ao workspace
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, p_user_id, p_role);

  RETURN json_build_object('success', true);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$;