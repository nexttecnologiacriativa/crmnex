-- Deletar estágios do pipeline "Pipeline de Vendas" duplicado
DELETE FROM pipeline_stages WHERE pipeline_id = '4400bb0a-5811-4150-ac07-1d76f3b71888';

-- Deletar o pipeline "Pipeline de Vendas" duplicado
DELETE FROM pipelines WHERE id = '4400bb0a-5811-4150-ac07-1d76f3b71888';