-- Criar tabela de configurações de usuário por workspace
CREATE TABLE public.user_workspace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  
  -- Configurações de visibilidade de leads
  can_see_all_leads BOOLEAN DEFAULT false,
  can_see_unassigned_leads BOOLEAN DEFAULT true,
  
  -- Instância padrão do usuário
  default_whatsapp_instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, workspace_id)
);

-- Adicionar colunas em workspace_settings para criação automática de lead
ALTER TABLE public.workspace_settings
ADD COLUMN IF NOT EXISTS auto_create_lead_from_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_whatsapp_pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS default_whatsapp_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;

-- Adicionar coluna para controlar quem recebe novos contatos
ALTER TABLE public.user_whatsapp_instances
ADD COLUMN IF NOT EXISTS receive_new_contacts BOOLEAN DEFAULT false;

-- Habilitar RLS
ALTER TABLE public.user_workspace_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_workspace_settings
CREATE POLICY "Users can view their own settings"
ON public.user_workspace_settings
FOR SELECT
USING (auth.uid() = user_id OR public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Users can update their own settings"
ON public.user_workspace_settings
FOR UPDATE
USING (auth.uid() = user_id OR public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Users can insert their own settings"
ON public.user_workspace_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_workspace_admin_or_owner(workspace_id));

CREATE POLICY "Admins can delete user settings"
ON public.user_workspace_settings
FOR DELETE
USING (public.is_workspace_admin_or_owner(workspace_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_workspace_settings_updated_at
BEFORE UPDATE ON public.user_workspace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();