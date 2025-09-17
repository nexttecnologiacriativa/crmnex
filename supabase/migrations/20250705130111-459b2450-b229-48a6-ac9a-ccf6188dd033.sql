-- Criar tabela para armazenar colunas customizadas de jobs
CREATE TABLE public.job_custom_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status_id TEXT NOT NULL,
  status_label TEXT NOT NULL,
  status_color TEXT NOT NULL DEFAULT '#6b7280',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, status_id)
);

-- Habilitar RLS
ALTER TABLE public.job_custom_statuses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage job custom statuses in their workspace"
ON public.job_custom_statuses
FOR ALL
USING (workspace_id IN (SELECT get_user_workspaces.workspace_id FROM get_user_workspaces()));

-- Adicionar trigger para updated_at
CREATE TRIGGER job_custom_statuses_updated_at
  BEFORE UPDATE ON public.job_custom_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();