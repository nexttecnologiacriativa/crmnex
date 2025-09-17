-- Habilitar realtime na tabela automation_queue para processamento automático
ALTER TABLE public.automation_queue REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_queue;