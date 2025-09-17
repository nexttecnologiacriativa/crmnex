
-- Adicionar campos de data às subtarefas
ALTER TABLE job_subtasks 
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- Criar tabela para comentários nos jobs
CREATE TABLE job_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  mentioned_users UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para job_comments
ALTER TABLE job_comments ENABLE ROW LEVEL SECURITY;

-- Política para visualizar comentários (membros do workspace)
CREATE POLICY "Users can view job comments in their workspace" 
  ON job_comments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_comments.job_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Política para criar comentários (membros do workspace)
CREATE POLICY "Users can create job comments in their workspace" 
  ON job_comments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_comments.job_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Política para atualizar comentários (apenas o autor)
CREATE POLICY "Users can update their own job comments" 
  ON job_comments 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política para deletar comentários (apenas o autor)
CREATE POLICY "Users can delete their own job comments" 
  ON job_comments 
  FOR DELETE 
  USING (auth.uid() = user_id);
