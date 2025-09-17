
-- Adicionar campos UTM que ainda não existem na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- Criar tabela para tags dos leads
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento entre leads e tags
CREATE TABLE IF NOT EXISTS public.lead_tag_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

-- Criar tabela para histórico de atividades dos leads
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'note', 'call', 'email', 'meeting', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para lead_tags (todos os usuários podem ver todas as tags)
CREATE POLICY "Users can view all tags" 
  ON public.lead_tags 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Users can create tags" 
  ON public.lead_tags 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para lead_tag_relations
CREATE POLICY "Users can view tag relations for accessible leads" 
  ON public.lead_tag_relations 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND user_belongs_to_workspace(l.workspace_id)
    )
  );

CREATE POLICY "Users can create tag relations for accessible leads" 
  ON public.lead_tag_relations 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND user_belongs_to_workspace(l.workspace_id)
    )
  );

CREATE POLICY "Users can delete tag relations for accessible leads" 
  ON public.lead_tag_relations 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND user_belongs_to_workspace(l.workspace_id)
    )
  );

-- Políticas RLS para lead_activities
CREATE POLICY "Users can view activities for accessible leads" 
  ON public.lead_activities 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND user_belongs_to_workspace(l.workspace_id)
    )
  );

CREATE POLICY "Users can create activities for accessible leads" 
  ON public.lead_activities 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND user_belongs_to_workspace(l.workspace_id)
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
