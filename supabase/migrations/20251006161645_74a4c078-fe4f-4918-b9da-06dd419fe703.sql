-- CAMADA 1: Lock atômico na fila - UPDATE ... RETURNING garante atomicidade
DROP FUNCTION IF EXISTS public.get_pending_automation_items(integer);

CREATE OR REPLACE FUNCTION public.get_pending_automation_items(item_limit integer DEFAULT 10)
RETURNS SETOF automation_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE automation_queue
  SET status = 'processing',
      processed_at = now()
  WHERE id IN (
    SELECT id
    FROM automation_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT item_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- CAMADA 2: Índice para otimizar verificação de idempotência
CREATE INDEX IF NOT EXISTS idx_automation_logs_flow_lead_executed 
ON automation_logs(flow_id, lead_id, executed_at DESC);