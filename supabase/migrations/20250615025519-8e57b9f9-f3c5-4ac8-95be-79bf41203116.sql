
-- Criar tabela para controlar status das contas
CREATE TABLE public.account_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by UUID REFERENCES auth.users(id),
  suspension_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Criar enum para tipo de usuário super admin
CREATE TYPE public.super_admin_role AS ENUM ('super_admin');

-- Adicionar coluna super_admin_role na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN super_admin_role super_admin_role;

-- Criar função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid 
    AND super_admin_role = 'super_admin'
  );
$$;

-- Criar função para verificar se workspace está ativo
CREATE OR REPLACE FUNCTION public.is_workspace_active(workspace_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.account_status WHERE workspace_id = workspace_uuid),
    true -- Default para ativo se não houver registro
  );
$$;

-- RLS para account_status
ALTER TABLE public.account_status ENABLE ROW LEVEL SECURITY;

-- Política para super admins verem todos os registros
CREATE POLICY "Super admins can view all account status" 
  ON public.account_status 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

-- Política para super admins modificarem status
CREATE POLICY "Super admins can modify account status" 
  ON public.account_status 
  FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER handle_updated_at_account_status
  BEFORE UPDATE ON public.account_status
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
