-- Criar função para buscar itens da fila com lock
CREATE OR REPLACE FUNCTION public.get_pending_automation_items(item_limit integer DEFAULT 10)
RETURNS SETOF automation_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM automation_queue
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT item_limit
  FOR UPDATE SKIP LOCKED;
END;
$$;