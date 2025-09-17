-- Adicionar campo para rastrear quando o lead mudou de etapa
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_stage_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Atualizar registros existentes para usar a data de criação como inicial
UPDATE public.leads 
SET pipeline_stage_updated_at = created_at 
WHERE pipeline_stage_updated_at IS NULL;

-- Criar trigger para atualizar automaticamente quando a etapa mudar
CREATE OR REPLACE FUNCTION public.update_pipeline_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a etapa mudou, atualizar o timestamp
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.pipeline_stage_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS trigger_update_pipeline_stage_timestamp ON public.leads;
CREATE TRIGGER trigger_update_pipeline_stage_timestamp
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pipeline_stage_timestamp();