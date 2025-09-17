
-- Habilitar RLS nas tabelas que precisam
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se necessário e recriar
DROP POLICY IF EXISTS "Users can view workspace members of their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can insert workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can update workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and managers can delete workspace members" ON public.workspace_members;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of workspace members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Criar políticas para workspace_members
CREATE POLICY "Users can view workspace members of their workspaces" 
ON public.workspace_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm2 
    WHERE wm2.workspace_id = workspace_members.workspace_id 
    AND wm2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert themselves as workspace members" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins and managers can insert workspace members" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can update workspace members" 
ON public.workspace_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Admins and managers can delete workspace members" 
ON public.workspace_members 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid() 
    AND wm.role IN ('admin', 'manager')
  )
);

-- Criar políticas para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of workspace members" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members wm1 
    JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id 
    WHERE wm1.user_id = auth.uid() 
    AND wm2.user_id = profiles.id
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);
