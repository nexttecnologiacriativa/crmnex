
-- Primeiro, vamos verificar e criar as tabelas necessárias para o sistema funcionar

-- Criar tabela de workspaces se não existir
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de membros do workspace se não existir
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user'::user_role,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Criar tabela de pipelines se não existir
CREATE TABLE IF NOT EXISTS public.pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de estágios do pipeline se não existir
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3b82f6',
  position integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Verificar se o tipo user_role existe, se não criar
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (usuário pode ver seus próprios workspaces)
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
CREATE POLICY "Users can view their workspaces" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid() OR id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view their workspace members" ON public.workspace_members;
CREATE POLICY "Users can view their workspace members" ON public.workspace_members
  FOR ALL USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view their pipelines" ON public.pipelines;
CREATE POLICY "Users can view their pipelines" ON public.pipelines
  FOR ALL USING (workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    UNION
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can view their pipeline stages" ON public.pipeline_stages;
CREATE POLICY "Users can view their pipeline stages" ON public.pipeline_stages
  FOR ALL USING (pipeline_id IN (
    SELECT p.id FROM public.pipelines p
    WHERE p.workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  ));
