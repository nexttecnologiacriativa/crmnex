-- Criar tabela de relacionamento many-to-many entre leads e pipelines
CREATE TABLE IF NOT EXISTS public.lead_pipeline_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(lead_id, pipeline_id)
);

-- Habilitar RLS
ALTER TABLE public.lead_pipeline_relations ENABLE ROW LEVEL SECURITY;

-- Política RLS para lead_pipeline_relations
CREATE POLICY "Users can access lead pipeline relations through lead"
ON public.lead_pipeline_relations
FOR ALL
USING (
  lead_id IN (
    SELECT id FROM public.leads WHERE user_has_workspace_access(workspace_id)
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_relations_lead_id ON public.lead_pipeline_relations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_relations_pipeline_id ON public.lead_pipeline_relations(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_relations_stage_id ON public.lead_pipeline_relations(stage_id);
CREATE INDEX IF NOT EXISTS idx_lead_pipeline_relations_primary ON public.lead_pipeline_relations(lead_id, is_primary) WHERE is_primary = true;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_pipeline_relations_updated_at
  BEFORE UPDATE ON public.lead_pipeline_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes para a nova tabela
INSERT INTO public.lead_pipeline_relations (lead_id, pipeline_id, stage_id, is_primary)
SELECT id, pipeline_id, stage_id, true
FROM public.leads
ON CONFLICT (lead_id, pipeline_id) DO NOTHING;