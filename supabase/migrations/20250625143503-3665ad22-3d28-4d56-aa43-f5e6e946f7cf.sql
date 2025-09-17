
-- Criar tabela para campanhas de marketing
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id TEXT,
  template_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  segments JSONB,
  leads_count INTEGER DEFAULT 0,
  message_preview TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para destinatários da campanha
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS policies
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas para marketing_campaigns
CREATE POLICY "Users can view marketing campaigns in their workspace" 
  ON public.marketing_campaigns 
  FOR SELECT 
  USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can create marketing campaigns in their workspace" 
  ON public.marketing_campaigns 
  FOR INSERT 
  WITH CHECK (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can update marketing campaigns in their workspace" 
  ON public.marketing_campaigns 
  FOR UPDATE 
  USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can delete marketing campaigns in their workspace" 
  ON public.marketing_campaigns 
  FOR DELETE 
  USING (user_belongs_to_workspace(workspace_id));

-- Políticas para campaign_recipients
CREATE POLICY "Users can view campaign recipients in their workspace" 
  ON public.campaign_recipients 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  ));

CREATE POLICY "Users can create campaign recipients in their workspace" 
  ON public.campaign_recipients 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  ));

CREATE POLICY "Users can update campaign recipients in their workspace" 
  ON public.campaign_recipients 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  ));

CREATE POLICY "Users can delete campaign recipients in their workspace" 
  ON public.campaign_recipients 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.marketing_campaigns mc 
    WHERE mc.id = campaign_recipients.campaign_id 
    AND user_belongs_to_workspace(mc.workspace_id)
  ));

-- Adicionar triggers para updated_at
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices para performance
CREATE INDEX idx_marketing_campaigns_workspace_id ON public.marketing_campaigns(workspace_id);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);
