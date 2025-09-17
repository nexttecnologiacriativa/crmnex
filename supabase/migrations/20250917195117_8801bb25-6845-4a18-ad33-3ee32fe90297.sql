-- Habilitar RLS apenas nas tabelas que ainda não têm
DO $$
BEGIN
    -- Verificar e habilitar RLS onde necessário
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables t 
        JOIN pg_class c ON c.relname = t.tablename 
        WHERE t.schemaname = 'public' AND t.tablename = 'whatsapp_conversations' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Continuar para outras tabelas...
END $$;

-- Criar políticas apenas se não existirem
DO $$
BEGIN
    -- WhatsApp webhook messages - política mais permissiva
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'whatsapp_webhook_messages' 
        AND policyname = 'All authenticated users can access webhook messages'
    ) THEN
        CREATE POLICY "All authenticated users can access webhook messages" ON public.whatsapp_webhook_messages
          FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Forçar habilitar RLS em todas as tabelas restantes
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

-- Criar políticas com DROP IF EXISTS primeiro
DROP POLICY IF EXISTS "Users can access whatsapp conversations in their workspace" ON public.whatsapp_conversations;
CREATE POLICY "Users can access whatsapp conversations in their workspace" ON public.whatsapp_conversations
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access whatsapp messages through conversation" ON public.whatsapp_messages;
CREATE POLICY "Users can access whatsapp messages through conversation" ON public.whatsapp_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.whatsapp_conversations 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can access whatsapp instances in their workspace" ON public.whatsapp_instances;
CREATE POLICY "Users can access whatsapp instances in their workspace" ON public.whatsapp_instances
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access whatsapp templates in their workspace" ON public.whatsapp_templates;
CREATE POLICY "Users can access whatsapp templates in their workspace" ON public.whatsapp_templates
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access whatsapp evolution configs in their workspace" ON public.whatsapp_evolution_configs;
CREATE POLICY "Users can access whatsapp evolution configs in their workspace" ON public.whatsapp_evolution_configs
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access whatsapp official configs in their workspace" ON public.whatsapp_official_configs;
CREATE POLICY "Users can access whatsapp official configs in their workspace" ON public.whatsapp_official_configs
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access whatsapp sync status in their workspace" ON public.whatsapp_sync_status;
CREATE POLICY "Users can access whatsapp sync status in their workspace" ON public.whatsapp_sync_status
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "All authenticated users can access webhook messages" ON public.whatsapp_webhook_messages;
CREATE POLICY "All authenticated users can access webhook messages" ON public.whatsapp_webhook_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para debriefings
DROP POLICY IF EXISTS "Users can access debriefings in their workspace" ON public.debriefings;
CREATE POLICY "Users can access debriefings in their workspace" ON public.debriefings
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access debriefing settings in their workspace" ON public.debriefing_settings;
CREATE POLICY "Users can access debriefing settings in their workspace" ON public.debriefing_settings
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access debriefing ads through debriefing" ON public.debriefing_ads;
CREATE POLICY "Users can access debriefing ads through debriefing" ON public.debriefing_ads
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can access debriefing pages through debriefing" ON public.debriefing_pages;
CREATE POLICY "Users can access debriefing pages through debriefing" ON public.debriefing_pages
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can access debriefing checkouts through debriefing" ON public.debriefing_checkouts;
CREATE POLICY "Users can access debriefing checkouts through debriefing" ON public.debriefing_checkouts
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

DROP POLICY IF EXISTS "Users can access debriefing products through debriefing" ON public.debriefing_products;
CREATE POLICY "Users can access debriefing products through debriefing" ON public.debriefing_products
  FOR ALL USING (
    debriefing_id IN (
      SELECT id FROM public.debriefings 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

-- Políticas para outras tabelas
DROP POLICY IF EXISTS "Users can access ai insights cache in their workspace" ON public.ai_insights_cache;
CREATE POLICY "Users can access ai insights cache in their workspace" ON public.ai_insights_cache
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access workspace limits in their workspace" ON public.workspace_limits;
CREATE POLICY "Users can access workspace limits in their workspace" ON public.workspace_limits
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Users can access account status in their workspace" ON public.account_status;
CREATE POLICY "Users can access account status in their workspace" ON public.account_status
  FOR ALL USING (public.user_has_workspace_access(workspace_id));