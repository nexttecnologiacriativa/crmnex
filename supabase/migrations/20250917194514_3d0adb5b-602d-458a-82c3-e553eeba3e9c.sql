-- Continuando com as tabelas do sistema de Jobs
CREATE TABLE public.job_boards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#3b82f6'::text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_boards_pkey PRIMARY KEY (id),
  CONSTRAINT job_boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'::text,
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  assigned_to uuid,
  created_by uuid NOT NULL,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tags text[] DEFAULT '{}'::text[],
  estimated_hours numeric,
  actual_hours numeric,
  board_id uuid,
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT jobs_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT jobs_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.job_boards(id)
);

CREATE TABLE public.job_subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  assigned_to uuid,
  CONSTRAINT job_subtasks_pkey PRIMARY KEY (id),
  CONSTRAINT job_subtasks_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT job_subtasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

CREATE TABLE public.job_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  mentioned_users uuid[] DEFAULT '{}'::uuid[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_comments_pkey PRIMARY KEY (id),
  CONSTRAINT job_comments_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT job_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.job_time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  user_id uuid NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  hours numeric,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_time_logs_pkey PRIMARY KEY (id),
  CONSTRAINT job_time_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE,
  CONSTRAINT job_time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.job_custom_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  status_id text NOT NULL,
  status_label text NOT NULL,
  status_color text NOT NULL DEFAULT '#6b7280'::text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT job_custom_statuses_pkey PRIMARY KEY (id),
  CONSTRAINT job_custom_statuses_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- Webhooks e integrações
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  secret text,
  is_active boolean DEFAULT true,
  pipeline_id uuid,
  stage_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT webhooks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT webhooks_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id),
  CONSTRAINT webhooks_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id)
);

CREATE TABLE public.n8n_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  pipeline_id uuid NOT NULL,
  webhook_url text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT n8n_webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT n8n_webhooks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT n8n_webhooks_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id)
);

CREATE TABLE public.platform_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  platform text NOT NULL,
  webhook_url text NOT NULL,
  selected_tag_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_pipeline_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platform_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT platform_integrations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT platform_integrations_pipeline_id_fkey FOREIGN KEY (selected_pipeline_id) REFERENCES public.pipelines(id)
);

-- Produtos
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  default_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.job_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_custom_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para as novas tabelas
CREATE POLICY "Users can access job boards in their workspace" ON public.job_boards
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access jobs in their workspace" ON public.jobs
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access job subtasks through job" ON public.job_subtasks
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access job comments through job" ON public.job_comments
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access job time logs through job" ON public.job_time_logs
  FOR ALL USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access job custom statuses in their workspace" ON public.job_custom_statuses
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access webhooks in their workspace" ON public.webhooks
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access n8n webhooks in their workspace" ON public.n8n_webhooks
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access platform integrations in their workspace" ON public.platform_integrations
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access products in their workspace" ON public.products
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

-- Índices adicionais
CREATE INDEX idx_jobs_workspace_id ON public.jobs(workspace_id);
CREATE INDEX idx_jobs_board_id ON public.jobs(board_id);
CREATE INDEX idx_jobs_assigned_to ON public.jobs(assigned_to);
CREATE INDEX idx_job_boards_workspace_id ON public.job_boards(workspace_id);
CREATE INDEX idx_job_subtasks_job_id ON public.job_subtasks(job_id);
CREATE INDEX idx_job_comments_job_id ON public.job_comments(job_id);
CREATE INDEX idx_job_time_logs_job_id ON public.job_time_logs(job_id);
CREATE INDEX idx_webhooks_workspace_id ON public.webhooks(workspace_id);
CREATE INDEX idx_products_workspace_id ON public.products(workspace_id);