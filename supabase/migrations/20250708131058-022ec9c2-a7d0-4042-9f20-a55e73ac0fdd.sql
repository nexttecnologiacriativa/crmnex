-- Adicionar configuração para pipeline padrão por workspace
CREATE TABLE IF NOT EXISTS workspace_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  default_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER workspace_settings_updated_at 
  BEFORE UPDATE ON workspace_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION handle_updated_at();

-- RLS policies
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage workspace settings in their workspace" 
  ON workspace_settings 
  FOR ALL 
  USING (user_belongs_to_workspace(workspace_id));

-- Adicionar coluna status no jobs para suportar status customizados sem restrições
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Adicionar colunas para as novas tags de pipeline nos leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_tag TEXT DEFAULT 'aberto' CHECK (pipeline_tag IN ('aberto', 'ganho', 'perdido'));

-- Criar index para performance
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_tag ON leads(pipeline_tag);
CREATE INDEX IF NOT EXISTS idx_workspace_settings_workspace_id ON workspace_settings(workspace_id);