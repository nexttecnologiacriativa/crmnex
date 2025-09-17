-- Criar tabela para configurações da Evolution API
CREATE TABLE whatsapp_evolution_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  api_url TEXT NOT NULL DEFAULT 'https://api.glav.com.br',
  global_api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE whatsapp_evolution_configs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view Evolution configs in their workspace" 
ON whatsapp_evolution_configs 
FOR SELECT 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Admins can create Evolution configs in their workspace" 
ON whatsapp_evolution_configs 
FOR INSERT 
WITH CHECK (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Admins can update Evolution configs in their workspace" 
ON whatsapp_evolution_configs 
FOR UPDATE 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Admins can delete Evolution configs in their workspace" 
ON whatsapp_evolution_configs 
FOR DELETE 
USING (user_belongs_to_workspace(workspace_id));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_whatsapp_evolution_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_evolution_configs_updated_at
  BEFORE UPDATE ON whatsapp_evolution_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_evolution_configs_updated_at();