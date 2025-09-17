-- Tabelas de Automação
CREATE TABLE public.automation_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}'::jsonb,
  steps jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  send_once_per_lead boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  success_rate integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT automation_flows_pkey PRIMARY KEY (id),
  CONSTRAINT automation_flows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.automation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  flow_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  step_name text,
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'error'::text, 'pending'::text])),
  message_sent text,
  error_message text,
  executed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT automation_logs_pkey PRIMARY KEY (id),
  CONSTRAINT automation_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT automation_logs_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  CONSTRAINT automation_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

CREATE TABLE public.automation_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  trigger_type text NOT NULL,
  lead_id uuid,
  trigger_data jsonb,
  processed_at timestamp with time zone,
  status text DEFAULT 'pending'::text,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT automation_queue_pkey PRIMARY KEY (id),
  CONSTRAINT automation_queue_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT automation_queue_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

CREATE TABLE public.automation_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  flow_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  executed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT automation_executions_pkey PRIMARY KEY (id),
  CONSTRAINT automation_executions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT automation_executions_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  CONSTRAINT automation_executions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE
);

-- Marketing
CREATE TABLE public.marketing_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  template_id text,
  template_name text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'failed'::text])),
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  segments jsonb,
  leads_count integer DEFAULT 0,
  message_preview text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  api_type text NOT NULL DEFAULT 'whatsapp_official'::text,
  message_interval_minutes integer DEFAULT 1,
  custom_numbers jsonb DEFAULT '[]'::jsonb,
  recipient_type text NOT NULL DEFAULT 'leads'::text,
  multiple_templates jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_campaigns_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.marketing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  default_api_type text NOT NULL DEFAULT 'whatsapp_official'::text,
  evolution_message_interval integer NOT NULL DEFAULT 2,
  max_messages_per_minute integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT marketing_settings_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  lead_id uuid,
  phone_number text NOT NULL,
  contact_name text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'read'::text, 'failed'::text])),
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  failed_at timestamp with time zone,
  error_message text,
  message_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_recipients_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);

CREATE TABLE public.marketing_campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  phone_number text NOT NULL,
  lead_id uuid,
  template_used text,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  failed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT marketing_campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT marketing_campaign_recipients_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id)
);

CREATE TABLE public.scheduler_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  execution_time timestamp with time zone DEFAULT now(),
  campaigns_found integer DEFAULT 0,
  campaigns_processed integer DEFAULT 0,
  campaigns_successful integer DEFAULT 0,
  campaigns_failed integer DEFAULT 0,
  execution_duration_ms integer,
  error_message text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scheduler_logs_pkey PRIMARY KEY (id)
);

-- Habilitar RLS
ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can access automation flows in their workspace" ON public.automation_flows
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access automation logs in their workspace" ON public.automation_logs
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access automation queue in their workspace" ON public.automation_queue
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access automation executions in their workspace" ON public.automation_executions
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access marketing campaigns in their workspace" ON public.marketing_campaigns
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access marketing settings in their workspace" ON public.marketing_settings
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access campaign recipients through campaign" ON public.campaign_recipients
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access marketing campaign recipients through campaign" ON public.marketing_campaign_recipients
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM public.marketing_campaigns 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

-- Scheduler logs podem ser acessados por todos (para debug)
CREATE POLICY "All users can view scheduler logs" ON public.scheduler_logs
  FOR SELECT USING (true);