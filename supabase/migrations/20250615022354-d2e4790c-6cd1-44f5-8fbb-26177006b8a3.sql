
-- Adicionar campo default_assignee à tabela pipelines
ALTER TABLE public.pipelines 
ADD COLUMN default_assignee UUID DEFAULT NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.pipelines.default_assignee IS 'ID do usuário que será responsável padrão pelos leads que entrarem neste pipeline';
