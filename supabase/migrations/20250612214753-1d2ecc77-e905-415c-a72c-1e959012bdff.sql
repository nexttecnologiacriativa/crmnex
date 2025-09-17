
-- Primeiro, vamos verificar e adicionar apenas as políticas que não existem

-- RLS para custom_fields
DO $$ 
BEGIN
    -- Habilitar RLS se não estiver habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_fields' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Verificar e criar políticas para custom_fields apenas se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_fields' 
        AND policyname = 'Users can view custom fields in their workspace'
    ) THEN
        CREATE POLICY "Users can view custom fields in their workspace" 
          ON public.custom_fields 
          FOR SELECT 
          USING (user_belongs_to_workspace(workspace_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_fields' 
        AND policyname = 'Users can create custom fields in their workspace'
    ) THEN
        CREATE POLICY "Users can create custom fields in their workspace" 
          ON public.custom_fields 
          FOR INSERT 
          WITH CHECK (user_belongs_to_workspace(workspace_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_fields' 
        AND policyname = 'Users can update custom fields in their workspace'
    ) THEN
        CREATE POLICY "Users can update custom fields in their workspace" 
          ON public.custom_fields 
          FOR UPDATE 
          USING (user_belongs_to_workspace(workspace_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'custom_fields' 
        AND policyname = 'Users can delete custom fields in their workspace'
    ) THEN
        CREATE POLICY "Users can delete custom fields in their workspace" 
          ON public.custom_fields 
          FOR DELETE 
          USING (user_belongs_to_workspace(workspace_id));
    END IF;
END $$;

-- RLS e políticas para lead_tags
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tags' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tags' 
        AND policyname = 'Anyone can view lead tags'
    ) THEN
        CREATE POLICY "Anyone can view lead tags" 
          ON public.lead_tags 
          FOR SELECT 
          USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tags' 
        AND policyname = 'Authenticated users can create lead tags'
    ) THEN
        CREATE POLICY "Authenticated users can create lead tags" 
          ON public.lead_tags 
          FOR INSERT 
          WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tags' 
        AND policyname = 'Authenticated users can update lead tags'
    ) THEN
        CREATE POLICY "Authenticated users can update lead tags" 
          ON public.lead_tags 
          FOR UPDATE 
          USING (auth.uid() IS NOT NULL);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tags' 
        AND policyname = 'Authenticated users can delete lead tags'
    ) THEN
        CREATE POLICY "Authenticated users can delete lead tags" 
          ON public.lead_tags 
          FOR DELETE 
          USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Função para verificar se o usuário tem acesso ao lead
CREATE OR REPLACE FUNCTION public.user_has_access_to_lead(lead_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.workspace_members wm ON l.workspace_id = wm.workspace_id
    WHERE l.id = lead_uuid 
    AND wm.user_id = auth.uid()
  );
END;
$function$;

-- RLS e políticas para lead_tag_relations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tag_relations' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.lead_tag_relations ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tag_relations' 
        AND policyname = 'Users can view tag relations for their leads'
    ) THEN
        CREATE POLICY "Users can view tag relations for their leads" 
          ON public.lead_tag_relations 
          FOR SELECT 
          USING (user_has_access_to_lead(lead_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tag_relations' 
        AND policyname = 'Users can create tag relations for their leads'
    ) THEN
        CREATE POLICY "Users can create tag relations for their leads" 
          ON public.lead_tag_relations 
          FOR INSERT 
          WITH CHECK (user_has_access_to_lead(lead_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tag_relations' 
        AND policyname = 'Users can update tag relations for their leads'
    ) THEN
        CREATE POLICY "Users can update tag relations for their leads" 
          ON public.lead_tag_relations 
          FOR UPDATE 
          USING (user_has_access_to_lead(lead_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'lead_tag_relations' 
        AND policyname = 'Users can delete tag relations for their leads'
    ) THEN
        CREATE POLICY "Users can delete tag relations for their leads" 
          ON public.lead_tag_relations 
          FOR DELETE 
          USING (user_has_access_to_lead(lead_id));
    END IF;
END $$;

-- Continuar com as demais tabelas apenas se as políticas não existirem...
-- RLS para leads
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'leads' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leads' 
        AND policyname = 'Users can view leads in their workspace'
    ) THEN
        CREATE POLICY "Users can view leads in their workspace" 
          ON public.leads 
          FOR SELECT 
          USING (user_belongs_to_workspace(workspace_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leads' 
        AND policyname = 'Users can create leads in their workspace'
    ) THEN
        CREATE POLICY "Users can create leads in their workspace" 
          ON public.leads 
          FOR INSERT 
          WITH CHECK (user_belongs_to_workspace(workspace_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leads' 
        AND policyname = 'Users can update leads in their workspace'
    ) THEN
        CREATE POLICY "Users can update leads in their workspace" 
          ON public.leads 
          FOR UPDATE 
          USING (user_belongs_to_workspace(workspace_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'leads' 
        AND policyname = 'Users can delete leads in their workspace'
    ) THEN
        CREATE POLICY "Users can delete leads in their workspace" 
          ON public.leads 
          FOR DELETE 
          USING (user_belongs_to_workspace(workspace_id));
    END IF;
END $$;

-- Continuar apenas com as que faltam para tasks, pipelines, etc.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Função para pipeline access se não existir
CREATE OR REPLACE FUNCTION public.user_has_access_to_pipeline(pipeline_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.pipelines p
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE p.id = pipeline_uuid 
    AND wm.user_id = auth.uid()
  );
END;
$function$;

-- Habilitar RLS para as demais tabelas se necessário
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'pipelines' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'pipeline_stages' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'workspaces' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'workspace_members' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
