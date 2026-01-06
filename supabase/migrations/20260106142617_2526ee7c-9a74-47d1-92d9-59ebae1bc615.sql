-- Configurações por instância WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_instance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  
  -- Criação automática de lead
  auto_create_lead BOOLEAN DEFAULT false,
  default_pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
  default_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  
  -- Atribuição automática
  assigned_to UUID,
  
  -- Tag automática
  auto_tag_id UUID REFERENCES public.lead_tags(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(instance_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_instance_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view settings for their workspace" ON public.whatsapp_instance_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.whatsapp_instance_settings;

-- Policies
CREATE POLICY "Users can view settings for their workspace"
ON public.whatsapp_instance_settings
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage settings"
ON public.whatsapp_instance_settings
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add allowed_sections to user_workspace_settings
ALTER TABLE public.user_workspace_settings
ADD COLUMN IF NOT EXISTS allowed_sections TEXT[] DEFAULT ARRAY[
  'dashboard', 'leads', 'pipeline', 'atendimento', 
  'tasks', 'jobs', 'reports', 'settings', 
  'marketing', 'automation', 'debriefing', 'tv-dashboard'
];