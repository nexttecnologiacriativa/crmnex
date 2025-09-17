-- Criar tabela para instâncias do WhatsApp Evolution API
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  instance_key TEXT NOT NULL,
  qr_code TEXT,
  status TEXT DEFAULT 'disconnected',
  phone_number TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE,
  UNIQUE(workspace_id, instance_name)
);

-- Enable RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view WhatsApp instances in their workspace" 
ON whatsapp_instances 
FOR SELECT 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can create WhatsApp instances in their workspace" 
ON whatsapp_instances 
FOR INSERT 
WITH CHECK (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can update WhatsApp instances in their workspace" 
ON whatsapp_instances 
FOR UPDATE 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can delete WhatsApp instances in their workspace" 
ON whatsapp_instances 
FOR DELETE 
USING (user_belongs_to_workspace(workspace_id));

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_instances_updated_at();