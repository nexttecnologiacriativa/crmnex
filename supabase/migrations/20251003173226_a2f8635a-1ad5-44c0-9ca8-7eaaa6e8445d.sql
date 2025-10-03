-- Criar função SECURITY DEFINER para criar workspace
CREATE OR REPLACE FUNCTION public.create_workspace_for_user(
  p_workspace_name text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
BEGIN
  -- Criar o workspace
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (p_workspace_name, p_user_id)
  RETURNING id INTO v_workspace_id;
  
  -- Adicionar o usuário como membro admin
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, p_user_id, 'admin');
  
  -- Criar recursos padrão usando a função existente
  PERFORM public.setup_default_workspace_data(v_workspace_id);
  
  RETURN v_workspace_id;
END;
$$;