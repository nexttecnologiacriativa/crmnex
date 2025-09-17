
-- Criar tabela para limites de uso por workspace
CREATE TABLE public.workspace_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  max_leads INTEGER DEFAULT NULL, -- NULL = sem limite
  max_tasks INTEGER DEFAULT NULL, -- NULL = sem limite  
  max_jobs INTEGER DEFAULT NULL, -- NULL = sem limite
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id)
);

-- Trigger para updated_at
CREATE TRIGGER handle_updated_at_workspace_limits
  BEFORE UPDATE ON public.workspace_limits
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- RLS para workspace_limits
ALTER TABLE public.workspace_limits ENABLE ROW LEVEL SECURITY;

-- Política para super admins verem todos os limites
CREATE POLICY "Super admins can view all workspace limits" 
  ON public.workspace_limits 
  FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

-- Política para super admins modificarem limites
CREATE POLICY "Super admins can modify workspace limits" 
  ON public.workspace_limits 
  FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Criar função para contar uso atual de cada workspace
CREATE OR REPLACE FUNCTION public.get_workspace_usage(workspace_uuid uuid)
RETURNS TABLE(
  leads_count integer,
  tasks_count integer,
  jobs_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    COALESCE((SELECT COUNT(*)::integer FROM public.leads WHERE workspace_id = workspace_uuid), 0) as leads_count,
    COALESCE((SELECT COUNT(*)::integer FROM public.tasks WHERE workspace_id = workspace_uuid), 0) as tasks_count,
    COALESCE((SELECT COUNT(*)::integer FROM public.jobs WHERE workspace_id = workspace_uuid), 0) as jobs_count;
$$;
