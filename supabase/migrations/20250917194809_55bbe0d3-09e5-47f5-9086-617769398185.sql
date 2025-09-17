-- Tabelas do WhatsApp (corrigidas)
CREATE TABLE public.whatsapp_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid,
  workspace_id uuid NOT NULL,
  phone_number text NOT NULL,
  contact_name text,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  instance_id uuid,
  is_read boolean DEFAULT false,
  message_count integer DEFAULT 0,
  CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id),
  CONSTRAINT whatsapp_conversations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text'::text,
  is_from_lead boolean NOT NULL DEFAULT true,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  message_id text,
  status text DEFAULT 'sent'::text,
  timestamp timestamp with time zone DEFAULT now(),
  media_url text,
  media_type text,
  attachment_name text,
  permanent_audio_url text,
  whatsapp_media_id text,
  encrypted_media_url text,
  CONSTRAINT whatsapp_messages_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  CONSTRAINT whatsapp_messages_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.whatsapp_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  instance_name text NOT NULL,
  instance_key text NOT NULL,
  qr_code text,
  status text NOT NULL DEFAULT 'disconnected'::text,
  phone_number text,
  webhook_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone,
  CONSTRAINT whatsapp_instances_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_instances_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general'::text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT whatsapp_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.whatsapp_evolution_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  api_url text NOT NULL DEFAULT 'https://api.glav.com.br'::text,
  global_api_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_evolution_configs_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_evolution_configs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.whatsapp_official_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  access_token text,
  phone_number_id text,
  webhook_verify_token text,
  app_secret text,
  business_account_id text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_official_configs_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_official_configs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.whatsapp_sync_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  instance_name text NOT NULL,
  last_sync_at timestamp with time zone NOT NULL DEFAULT now(),
  total_conversations integer DEFAULT 0,
  processed_conversations integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  sync_options jsonb DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_sync_status_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_sync_status_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.whatsapp_webhook_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  from_me boolean NOT NULL DEFAULT false,
  push_name text,
  message_type text NOT NULL,
  text text,
  timestamp bigint NOT NULL,
  raw jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  custom_fields jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT whatsapp_webhook_messages_pkey PRIMARY KEY (id)
);

-- Debriefings (sem colunas calculadas no DEFAULT)
CREATE TABLE public.debriefings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  project_name text NOT NULL,
  campaign_type text NOT NULL,
  start_date date,
  end_date date,
  responsible text,
  what_happened text,
  what_worked text,
  what_could_improve text,
  next_steps text,
  total_investment numeric,
  gross_revenue numeric,
  net_revenue numeric,
  leads_captured integer,
  sales_made integer,
  page_url text,
  total_views integer,
  unique_visitors integer,
  cta_clicks integer,
  conversions integer,
  avg_time_on_page integer,
  predominant_device text,
  predominant_traffic_source text,
  checkout_views integer,
  checkout_starts integer,
  checkout_abandonments integer,
  completed_purchases integer,
  abandonment_reasons text,
  checkout_platform text,
  net_revenue_calculated numeric,
  net_revenue_with_costs numeric,
  CONSTRAINT debriefings_pkey PRIMARY KEY (id),
  CONSTRAINT debriefings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT debriefings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

CREATE TABLE public.debriefing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  fixed_cost numeric DEFAULT 0,
  tax_percentage numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT debriefing_settings_pkey PRIMARY KEY (id),
  CONSTRAINT debriefing_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.debriefing_ads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  debriefing_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  ad_name text NOT NULL,
  ad_type text NOT NULL,
  platform text NOT NULL,
  campaign_objective text NOT NULL,
  view_link text,
  total_spent numeric,
  leads_generated integer,
  sales_generated integer,
  ctr numeric,
  cpm numeric,
  cpc numeric,
  observations text,
  performance_rating integer CHECK (performance_rating >= 1 AND performance_rating <= 5),
  creative_file_url text,
  CONSTRAINT debriefing_ads_pkey PRIMARY KEY (id),
  CONSTRAINT debriefing_ads_debriefing_id_fkey FOREIGN KEY (debriefing_id) REFERENCES public.debriefings(id) ON DELETE CASCADE
);

CREATE TABLE public.debriefing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  debriefing_id uuid NOT NULL,
  name text NOT NULL,
  page_url text,
  total_views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  cta_clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  conversion_rate numeric,
  avg_time_on_page integer DEFAULT 0,
  predominant_device text,
  predominant_traffic_source text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT debriefing_pages_pkey PRIMARY KEY (id),
  CONSTRAINT debriefing_pages_debriefing_id_fkey FOREIGN KEY (debriefing_id) REFERENCES public.debriefings(id) ON DELETE CASCADE
);

CREATE TABLE public.debriefing_checkouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  debriefing_id uuid NOT NULL,
  product_id uuid,
  name text NOT NULL,
  checkout_url text,
  platform text,
  total_views integer DEFAULT 0,
  checkout_starts integer DEFAULT 0,
  checkout_abandonments integer DEFAULT 0,
  completed_purchases integer DEFAULT 0,
  conversion_rate numeric,
  abandonment_rate numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT debriefing_checkouts_pkey PRIMARY KEY (id),
  CONSTRAINT debriefing_checkouts_debriefing_id_fkey FOREIGN KEY (debriefing_id) REFERENCES public.debriefings(id) ON DELETE CASCADE,
  CONSTRAINT debriefing_checkouts_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.debriefing_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  debriefing_id uuid NOT NULL,
  product_id uuid NOT NULL,
  unit_price numeric NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 0,
  total_revenue numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT debriefing_products_pkey PRIMARY KEY (id),
  CONSTRAINT debriefing_products_debriefing_id_fkey FOREIGN KEY (debriefing_id) REFERENCES public.debriefings(id) ON DELETE CASCADE,
  CONSTRAINT debriefing_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Tabelas finais
CREATE TABLE public.ai_insights_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  insights_data jsonb NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '06:00:00'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_insights_cache_pkey PRIMARY KEY (id),
  CONSTRAINT ai_insights_cache_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.workspace_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  max_leads integer,
  max_tasks integer,
  max_jobs integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT workspace_limits_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_limits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT workspace_limits_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.account_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  suspended_at timestamp with time zone,
  suspended_by uuid,
  suspension_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_status_pkey PRIMARY KEY (id),
  CONSTRAINT account_status_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT account_status_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES auth.users(id)
);