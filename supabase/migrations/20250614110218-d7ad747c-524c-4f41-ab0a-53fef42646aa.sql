
-- Desabilitar RLS temporariamente para fazer limpeza total
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes (fazendo uma limpeza mais agressiva)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Remover todas as políticas da tabela workspaces
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.workspaces';
    END LOOP;
    
    -- Remover todas as políticas da tabela workspace_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.workspace_members';
    END LOOP;
END $$;

-- Reabilitar RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Criar apenas uma política para workspaces - SOMENTE para owners diretos
CREATE POLICY "workspaces_simple_owner_policy" 
ON public.workspaces 
FOR ALL 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Criar apenas uma política para workspace_members - SOMENTE para o próprio usuário
CREATE POLICY "workspace_members_simple_user_policy" 
ON public.workspace_members 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
