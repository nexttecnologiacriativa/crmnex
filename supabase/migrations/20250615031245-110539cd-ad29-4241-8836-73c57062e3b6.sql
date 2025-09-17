
-- Remover políticas duplicadas se existirem e criar as necessárias
DROP POLICY IF EXISTS "Super admins can view all account status" ON public.account_status;
DROP POLICY IF EXISTS "Super admins can modify account status" ON public.account_status;

-- Políticas RLS para super admins terem acesso completo

-- Política para workspaces - super admins podem ver todos
DROP POLICY IF EXISTS "Super admins can view all workspaces" ON public.workspaces;
CREATE POLICY "Super admins can view all workspaces" 
  ON public.workspaces 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

-- Política para workspace_members - super admins podem ver todos os membros
DROP POLICY IF EXISTS "Super admins can view all workspace members" ON public.workspace_members;
CREATE POLICY "Super admins can view all workspace members" 
  ON public.workspace_members 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

-- Política para profiles - super admins podem ver todos os perfis
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

-- Recriar políticas para account_status
CREATE POLICY "Super admins can view all account status" 
  ON public.account_status 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can modify account status" 
  ON public.account_status 
  FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Habilitar RLS nas tabelas se ainda não estiver habilitado
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_status ENABLE ROW LEVEL SECURITY;

-- Política para leads, tasks e jobs para contagem de uso
DROP POLICY IF EXISTS "Super admins can view all leads for usage counting" ON public.leads;
CREATE POLICY "Super admins can view all leads for usage counting" 
  ON public.leads 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all tasks for usage counting" ON public.tasks;
CREATE POLICY "Super admins can view all tasks for usage counting" 
  ON public.tasks 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all jobs for usage counting" ON public.jobs;
CREATE POLICY "Super admins can view all jobs for usage counting" 
  ON public.jobs 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

-- Habilitar RLS nas tabelas de contagem se necessário
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
