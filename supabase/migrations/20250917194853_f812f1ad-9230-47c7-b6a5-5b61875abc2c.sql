-- Habilitar RLS nas novas tabelas do WhatsApp e debriefings
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_evolution_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_official_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debriefing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para WhatsApp
CREATE POLICY "Users can access whatsapp conversations in their workspace" ON public.whatsapp_conversations
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access whatsapp messages through conversation" ON public.whatsapp_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.whatsapp_conversations 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access whatsapp instances in their workspace" ON public.whatsapp_instances
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access whatsapp templates in their workspace" ON public.whatsapp_templates
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access whatsapp evolution configs in their workspace" ON public.whatsapp_evolution_configs
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access whatsapp official configs in their workspace" ON public.whatsapp_official_configs
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access whatsapp sync status in their workspace" ON public.whatsapp_sync_status
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

-- WhatsApp webhook messages podem ser acessadas por todos (para webhook processing)
CREATE POLICY "All authenticated users can access webhook messages" ON public.whatsapp_webhook_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para debriefings
CREATE POLICY "Users can access debriefings in their workspace" ON public.debriefings
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access debriefing settings in their workspace" ON public.debriefing_settings
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access debriefing ads through debriefing" ON public.debriefing_ads
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access debriefing pages through debriefing" ON public.debriefing_pages
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access debriefing checkouts through debriefing" ON public.debriefing_checkouts
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access debriefing products through debriefing" ON public.debriefing_products
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

-- Políticas para outras tabelas
CREATE POLICY "Users can access ai insights cache in their workspace" ON public.ai_insights_cache
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access workspace limits in their workspace" ON public.workspace_limits
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access account status in their workspace" ON public.account_status
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

-- Índices adicionais para performance
CREATE INDEX idx_whatsapp_conversations_workspace_id ON public.whatsapp_conversations(workspace_id);
CREATE INDEX idx_whatsapp_conversations_phone ON public.whatsapp_conversations(phone_number);
CREATE INDEX idx_whatsapp_messages_conversation_id ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_instances_workspace_id ON public.whatsapp_instances(workspace_id);
CREATE INDEX idx_whatsapp_templates_workspace_id ON public.whatsapp_templates(workspace_id);
CREATE INDEX idx_debriefings_workspace_id ON public.debriefings(workspace_id);
CREATE INDEX idx_debriefing_ads_debriefing_id ON public.debriefing_ads(debriefing_id);
CREATE INDEX idx_debriefing_pages_debriefing_id ON public.debriefing_pages(debriefing_id);
CREATE INDEX idx_debriefing_checkouts_debriefing_id ON public.debriefing_checkouts(debriefing_id);
CREATE INDEX idx_debriefing_products_debriefing_id ON public.debriefing_products(debriefing_id);
CREATE INDEX idx_ai_insights_cache_workspace_id ON public.ai_insights_cache(workspace_id);

-- Triggers para calcular valores automaticamente
CREATE OR REPLACE FUNCTION public.update_debriefing_calculated_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular net_revenue_calculated
  IF NEW.gross_revenue IS NOT NULL THEN
    NEW.net_revenue_calculated = NEW.gross_revenue - COALESCE(NEW.total_investment, 0);
  ELSE
    NEW.net_revenue_calculated = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_debriefing_calculated_fields
  BEFORE INSERT OR UPDATE ON public.debriefings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_debriefing_calculated_fields();

-- Trigger para calcular conversion_rate nas páginas
CREATE OR REPLACE FUNCTION public.update_debriefing_page_rates()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular conversion_rate
  IF NEW.total_views > 0 THEN
    NEW.conversion_rate = (NEW.conversions::numeric / NEW.total_views::numeric) * 100;
  ELSE
    NEW.conversion_rate = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_debriefing_page_rates
  BEFORE INSERT OR UPDATE ON public.debriefing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_debriefing_page_rates();

-- Trigger para calcular rates nos checkouts
CREATE OR REPLACE FUNCTION public.update_debriefing_checkout_rates()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular conversion_rate
  IF NEW.total_views > 0 THEN
    NEW.conversion_rate = (NEW.completed_purchases::numeric / NEW.total_views::numeric) * 100;
  ELSE
    NEW.conversion_rate = 0;
  END IF;
  
  -- Calcular abandonment_rate
  IF NEW.checkout_starts > 0 THEN
    NEW.abandonment_rate = (NEW.checkout_abandonments::numeric / NEW.checkout_starts::numeric) * 100;
  ELSE
    NEW.abandonment_rate = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_debriefing_checkout_rates
  BEFORE INSERT OR UPDATE ON public.debriefing_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_debriefing_checkout_rates();

-- Trigger para calcular total_revenue nos produtos
CREATE OR REPLACE FUNCTION public.update_debriefing_product_revenue()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_revenue = NEW.unit_price * NEW.quantity_sold;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_debriefing_product_revenue
  BEFORE INSERT OR UPDATE ON public.debriefing_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_debriefing_product_revenue();