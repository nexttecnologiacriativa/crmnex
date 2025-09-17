
-- Esta migração consolida e corrige as permissões para o gerenciamento de membros de um workspace.
-- Garante que todas as funções auxiliares e políticas de segurança (RLS) estejam corretamente definidas.

-- 1. (Re)criar a função para verificar se o usuário é admin ou gerente.
-- Incluindo logs para depuração, caso o problema persista.
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_manager(p_workspace_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_admin_or_manager BOOLEAN;
BEGIN
  RAISE NOTICE '[is_workspace_admin_or_manager] Checking workspace: %, user: %', p_workspace_id, auth.uid();
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.workspace_id = p_workspace_id
      AND wm.role IN ('admin', 'manager')
  ) INTO is_admin_or_manager;
  RAISE NOTICE '[is_workspace_admin_or_manager] Result: %', is_admin_or_manager;
  RETURN is_admin_or_manager;
END;
$$;

-- 2. Criar a função para verificar se o usuário é o dono do workspace.
CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.owner_id = auth.uid()
  );
$$;

-- 3. Limpar políticas antigas para evitar conflitos.
DROP POLICY IF EXISTS "Admins and managers can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners, admins, and managers can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners, admins, and managers can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners, admins, and managers can delete members" ON public.workspace_members;


-- 4. Criar as novas políticas que permitem ao dono, admin ou gerente gerenciar membros.

-- INSERT:
CREATE POLICY "Owners, admins, and managers can add members"
ON public.workspace_members
FOR INSERT
WITH CHECK (
  public.is_workspace_admin_or_manager(workspace_id) OR public.is_workspace_owner(workspace_id)
);

-- UPDATE:
CREATE POLICY "Owners, admins, and managers can update members"
ON public.workspace_members
FOR UPDATE
USING (
  public.is_workspace_admin_or_manager(workspace_id) OR public.is_workspace_owner(workspace_id)
)
WITH CHECK (
  public.is_workspace_admin_or_manager(workspace_id) OR public.is_workspace_owner(workspace_id)
);

-- DELETE:
CREATE POLICY "Owners, admins, and managers can delete members"
ON public.workspace_members
FOR DELETE
USING (
  public.is_workspace_admin_or_manager(workspace_id) OR public.is_workspace_owner(workspace_id)
);
