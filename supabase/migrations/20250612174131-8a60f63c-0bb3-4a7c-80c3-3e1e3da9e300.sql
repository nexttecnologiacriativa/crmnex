
-- Primeiro, vamos verificar e corrigir as políticas RLS para lead_activities
DROP POLICY IF EXISTS "Users can create activities for accessible leads" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can view activities for accessible leads" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.lead_activities;

-- Criar políticas RLS mais simples e diretas
CREATE POLICY "Users can view activities for their workspace leads" 
  ON public.lead_activities 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      JOIN public.workspaces w ON l.workspace_id = w.id 
      WHERE l.id = lead_id 
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities for their workspace leads" 
  ON public.lead_activities 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.leads l 
      JOIN public.workspaces w ON l.workspace_id = w.id 
      WHERE l.id = lead_id 
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own activities" 
  ON public.lead_activities 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" 
  ON public.lead_activities 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar tabela para gerenciar campos personalizados
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'select', 'textarea'
  options JSONB DEFAULT NULL, -- Para campos do tipo select
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Habilitar RLS na tabela custom_fields
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para custom_fields
CREATE POLICY "Users can view custom fields for their workspace" 
  ON public.custom_fields 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id 
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create custom fields for their workspace" 
  ON public.custom_fields 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id 
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update custom fields for their workspace" 
  ON public.custom_fields 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id 
      AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete custom fields for their workspace" 
  ON public.custom_fields 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w 
      WHERE w.id = workspace_id 
      AND w.owner_id = auth.uid()
    )
  );
