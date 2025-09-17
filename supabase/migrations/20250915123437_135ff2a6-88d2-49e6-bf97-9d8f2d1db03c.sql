-- Adicionar campos à tabela marketing_campaigns para suportar novas funcionalidades
ALTER TABLE public.marketing_campaigns 
ADD COLUMN api_type text NOT NULL DEFAULT 'whatsapp_official',
ADD COLUMN message_interval_minutes integer DEFAULT 1,
ADD COLUMN custom_numbers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN recipient_type text NOT NULL DEFAULT 'leads',
ADD COLUMN multiple_templates jsonb DEFAULT '[]'::jsonb;

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.marketing_campaigns.api_type IS 'Tipo de API: whatsapp_official ou evolution';
COMMENT ON COLUMN public.marketing_campaigns.message_interval_minutes IS 'Intervalo em minutos entre mensagens (apenas Evolution API)';
COMMENT ON COLUMN public.marketing_campaigns.custom_numbers IS 'Lista de números personalizados quando recipient_type = custom_numbers';
COMMENT ON COLUMN public.marketing_campaigns.recipient_type IS 'Tipo de destinatários: leads, custom_numbers, ou csv_upload';
COMMENT ON COLUMN public.marketing_campaigns.multiple_templates IS 'Array de templates múltiplos com name, preview, etc.';

-- Criar tabela para recipients individuais de campanha
CREATE TABLE public.marketing_campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  lead_id uuid DEFAULT NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  template_used text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone DEFAULT NULL,
  delivered_at timestamp with time zone DEFAULT NULL,
  read_at timestamp with time zone DEFAULT NULL,
  failed_at timestamp with time zone DEFAULT NULL,
  error_message text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS para marketing_campaign_recipients
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para marketing_campaign_recipients
CREATE POLICY "Users can view campaign recipients in their workspace" 
ON public.marketing_campaign_recipients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = marketing_campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  )
);

CREATE POLICY "Users can create campaign recipients in their workspace" 
ON public.marketing_campaign_recipients 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = marketing_campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  )
);

CREATE POLICY "Users can update campaign recipients in their workspace" 
ON public.marketing_campaign_recipients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = marketing_campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  )
);

CREATE POLICY "Service can update campaign recipients status" 
ON public.marketing_campaign_recipients 
FOR UPDATE 
USING (true);

-- Criar índices para performance
CREATE INDEX idx_marketing_campaign_recipients_campaign_id ON public.marketing_campaign_recipients(campaign_id);
CREATE INDEX idx_marketing_campaign_recipients_status ON public.marketing_campaign_recipients(status);
CREATE INDEX idx_marketing_campaign_recipients_phone ON public.marketing_campaign_recipients(phone_number);

-- Criar trigger para updated_at
CREATE TRIGGER update_marketing_campaign_recipients_updated_at
  BEFORE UPDATE ON public.marketing_campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Criar tabela para configurações de marketing por workspace
CREATE TABLE public.marketing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  default_api_type text NOT NULL DEFAULT 'whatsapp_official',
  evolution_message_interval integer NOT NULL DEFAULT 2,
  max_messages_per_minute integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS para marketing_settings
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para marketing_settings
CREATE POLICY "Users can manage marketing settings in their workspace" 
ON public.marketing_settings 
FOR ALL 
USING (user_belongs_to_workspace(workspace_id));

-- Criar trigger para updated_at em marketing_settings
CREATE TRIGGER update_marketing_settings_updated_at
  BEFORE UPDATE ON public.marketing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();