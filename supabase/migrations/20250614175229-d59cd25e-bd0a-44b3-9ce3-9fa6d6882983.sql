
-- Criar tabela para configurações do WhatsApp Business API oficial
CREATE TABLE public.whatsapp_official_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  access_token TEXT,
  phone_number_id TEXT,
  webhook_verify_token TEXT,
  app_secret TEXT,
  business_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Garantir apenas uma configuração por workspace
  UNIQUE(workspace_id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.whatsapp_official_configs ENABLE ROW LEVEL SECURITY;

-- Política para que usuários vejam apenas configurações do seu workspace
CREATE POLICY "Users can view whatsapp configs from their workspace" 
  ON public.whatsapp_official_configs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = whatsapp_official_configs.workspace_id 
      AND user_id = auth.uid()
    )
  );

-- Política para que admins/managers possam inserir configurações
CREATE POLICY "Admins can insert whatsapp configs" 
  ON public.whatsapp_official_configs 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = whatsapp_official_configs.workspace_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Política para que admins/managers possam atualizar configurações
CREATE POLICY "Admins can update whatsapp configs" 
  ON public.whatsapp_official_configs 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = whatsapp_official_configs.workspace_id 
      AND user_id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Política para que admins possam deletar configurações
CREATE POLICY "Admins can delete whatsapp configs" 
  ON public.whatsapp_official_configs 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = whatsapp_official_configs.workspace_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_whatsapp_official_configs_updated_at
  BEFORE UPDATE ON public.whatsapp_official_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
