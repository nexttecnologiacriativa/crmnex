-- Criar tabela para armazenar configurações de integrações com plataformas
CREATE TABLE public.platform_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  selected_tag_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_pipeline_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage platform integrations in their workspace" 
ON public.platform_integrations 
FOR ALL 
USING (user_belongs_to_workspace(workspace_id));

-- Add trigger for updated_at
CREATE TRIGGER update_platform_integrations_updated_at
BEFORE UPDATE ON public.platform_integrations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();