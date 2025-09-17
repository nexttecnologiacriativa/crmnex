
-- Adicionar tabela para gerenciar instâncias do WhatsApp
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  instance_key TEXT NOT NULL,
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  phone_number TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE
);

-- Adicionar colunas para melhor controle das conversas
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN instance_id UUID,
ADD COLUMN is_read BOOLEAN DEFAULT false,
ADD COLUMN message_count INTEGER DEFAULT 0;

-- Adicionar colunas para melhor controle das mensagens
ALTER TABLE public.whatsapp_messages 
ADD COLUMN message_id TEXT,
ADD COLUMN status TEXT DEFAULT 'sent',
ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT now();

-- RLS para whatsapp_instances
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view instances in their workspace" 
  ON public.whatsapp_instances 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = whatsapp_instances.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create instances in their workspace" 
  ON public.whatsapp_instances 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = whatsapp_instances.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update instances in their workspace" 
  ON public.whatsapp_instances 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = whatsapp_instances.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_instances_updated_at();
