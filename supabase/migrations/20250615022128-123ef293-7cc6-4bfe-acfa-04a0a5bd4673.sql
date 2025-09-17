
-- Adicionar campo default_value à tabela pipelines
ALTER TABLE public.pipelines 
ADD COLUMN default_value NUMERIC DEFAULT NULL;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.pipelines.default_value IS 'Valor padrão em reais que será atribuído aos leads que entrarem neste pipeline';
