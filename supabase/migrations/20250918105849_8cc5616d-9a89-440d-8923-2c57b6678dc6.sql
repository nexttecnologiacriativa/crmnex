-- FASE 1: LIMPEZA TOTAL DAS POLÍTICAS DE WORKSPACE
-- Remover TODAS as políticas existentes da tabela workspaces
DROP POLICY IF EXISTS "Allow owners to access their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_simple_access" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_access_policy" ON public.workspaces;
DROP POLICY IF EXISTS "Enable insert for owners" ON public.workspaces;
DROP POLICY IF EXISTS "Enable update for owners" ON public.workspaces;
DROP POLICY IF EXISTS "Enable delete for owners" ON public.workspaces;

-- FASE 2: CRIAR POLÍTICA ÚNICA E SIMPLES
-- Usar a função user_has_workspace_access existente para evitar recursão
CREATE POLICY "workspace_access" 
ON public.workspaces FOR ALL 
TO authenticated
USING (public.user_has_workspace_access(id))
WITH CHECK (public.user_has_workspace_access(id));

-- FASE 4: BACKUP E VERIFICAÇÃO DOS DADOS
-- Verificar se há workspaces e pipelines existentes
-- (Esta query será apenas informativa - os dados são preservados automaticamente)
-- SELECT COUNT(*) as workspace_count FROM public.workspaces;
-- SELECT COUNT(*) as pipeline_count FROM public.pipelines;