-- Criar ENUMs necessários
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'manager');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.super_admin_role AS ENUM ('super_admin', 'support');

-- Criar tabela workspaces (base)
CREATE TABLE public.workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);

-- Criar tabela profiles (usuários)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role user_role DEFAULT 'user'::user_role,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  super_admin_role super_admin_role,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Adicionar foreign key para workspaces depois que profiles existe
ALTER TABLE public.workspaces 
ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id);

-- Criar tabelas de workspace
CREATE TABLE public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role user_role DEFAULT 'user'::user_role,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, user_id)
);

-- Criar tabela pipelines
CREATE TABLE public.pipelines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  default_value numeric,
  default_assignee uuid,
  CONSTRAINT pipelines_pkey PRIMARY KEY (id),
  CONSTRAINT pipelines_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- Criar tabela pipeline_stages
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3b82f6'::text,
  position integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id),
  CONSTRAINT pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE
);

-- Criar workspace_settings (precisa de pipeline_id)
CREATE TABLE public.workspace_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE,
  default_pipeline_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  n8n_webhook_url text,
  openai_api_key text,
  ai_insights_pipeline_ids uuid[],
  CONSTRAINT workspace_settings_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_settings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT workspace_settings_default_pipeline_id_fkey FOREIGN KEY (default_pipeline_id) REFERENCES public.pipelines(id)
);

-- Criar tabela custom_fields
CREATE TABLE public.custom_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text'::text,
  options jsonb,
  is_required boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT custom_fields_pkey PRIMARY KEY (id),
  CONSTRAINT custom_fields_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- Criar tabela leads
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  pipeline_id uuid NOT NULL,
  stage_id uuid NOT NULL,
  assigned_to uuid,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  position text,
  value numeric,
  currency text DEFAULT 'BRL'::text,
  notes text,
  status lead_status DEFAULT 'new'::lead_status,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  custom_fields jsonb DEFAULT '{}'::jsonb,
  pipeline_tag text DEFAULT 'aberto'::text CHECK (pipeline_tag = ANY (ARRAY['aberto'::text, 'ganho'::text, 'perdido'::text])),
  pipeline_stage_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT leads_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id),
  CONSTRAINT leads_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.pipeline_stages(id),
  CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

-- Criar tabela lead_tags
CREATE TABLE public.lead_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  workspace_id uuid,
  CONSTRAINT lead_tags_pkey PRIMARY KEY (id),
  CONSTRAINT lead_tags_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE
);

-- Criar tabela lead_tag_relations
CREATE TABLE public.lead_tag_relations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lead_tag_relations_pkey PRIMARY KEY (id),
  CONSTRAINT lead_tag_relations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT lead_tag_relations_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  CONSTRAINT lead_tag_relations_unique UNIQUE (lead_id, tag_id)
);

-- Criar tabela lead_activities
CREATE TABLE public.lead_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lead_activities_pkey PRIMARY KEY (id),
  CONSTRAINT lead_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT lead_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Criar tabela tasks
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid,
  assigned_to uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority task_priority DEFAULT 'medium'::task_priority,
  status task_status DEFAULT 'pending'::task_status,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- Criar tabela activities
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  lead_id uuid,
  user_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  CONSTRAINT activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- Criar trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Habilitar RLS em todas as tabelas principais
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Função para verificar se o usuário pertence a um workspace
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(workspace_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Políticas RLS básicas para workspaces
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their workspaces" ON public.workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

-- Políticas para profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para workspace_members
CREATE POLICY "Users can view members of their workspaces" ON public.workspace_members
  FOR SELECT USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Workspace owners can manage members" ON public.workspace_members
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Políticas para leads (baseadas em workspace)
CREATE POLICY "Users can access leads in their workspace" ON public.leads
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

-- Políticas para pipelines
CREATE POLICY "Users can access pipelines in their workspace" ON public.pipelines
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

-- Políticas para pipeline_stages
CREATE POLICY "Users can access pipeline stages through pipeline" ON public.pipeline_stages
  FOR ALL USING (
    pipeline_id IN (
      SELECT id FROM public.pipelines 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

-- Políticas para outras tabelas baseadas em workspace
CREATE POLICY "Users can access workspace settings" ON public.workspace_settings
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access custom fields in their workspace" ON public.custom_fields
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access tasks in their workspace" ON public.tasks
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access activities in their workspace" ON public.activities
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access lead tags in their workspace" ON public.lead_tags
  FOR ALL USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can access lead tag relations through lead" ON public.lead_tag_relations
  FOR ALL USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

CREATE POLICY "Users can access lead activities through lead" ON public.lead_activities
  FOR ALL USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE public.user_has_workspace_access(workspace_id)
    )
  );

-- Índices para performance
CREATE INDEX idx_workspace_members_workspace_user ON public.workspace_members(workspace_id, user_id);
CREATE INDEX idx_leads_workspace_id ON public.leads(workspace_id);
CREATE INDEX idx_leads_pipeline_stage ON public.leads(pipeline_id, stage_id);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_pipelines_workspace_id ON public.pipelines(workspace_id);
CREATE INDEX idx_pipeline_stages_pipeline_id ON public.pipeline_stages(pipeline_id);
CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_activities_workspace_id ON public.activities(workspace_id);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_tag_relations_lead_id ON public.lead_tag_relations(lead_id);
CREATE INDEX idx_lead_tag_relations_tag_id ON public.lead_tag_relations(tag_id);