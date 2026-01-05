-- Função RPC para calcular métricas de tempo de resposta do WhatsApp
-- Calcula o tempo médio entre mensagem do lead e resposta da equipe

CREATE OR REPLACE FUNCTION public.get_whatsapp_response_metrics(
  p_workspace_id uuid,
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  pairs_total integer,
  avg_minutes numeric,
  median_minutes numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date timestamp with time zone;
BEGIN
  -- Validar acesso ao workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = p_workspace_id 
    AND user_id = auth.uid()
  ) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado ao workspace';
  END IF;

  v_start_date := now() - (p_days_back || ' days')::interval;

  RETURN QUERY
  WITH msgs AS (
    -- Pegar todas as mensagens das conversas do workspace
    SELECT 
      m.id,
      m.conversation_id,
      m.is_from_lead,
      COALESCE(m.timestamp, m.created_at) as ts
    FROM whatsapp_messages m
    INNER JOIN whatsapp_conversations c ON c.id = m.conversation_id
    WHERE c.workspace_id = p_workspace_id
      AND COALESCE(m.timestamp, m.created_at) >= v_start_date
  ),
  lead_msgs AS (
    -- Mensagens do lead
    SELECT 
      conversation_id,
      ts as lead_ts,
      ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY ts) as rn
    FROM msgs 
    WHERE is_from_lead = true
  ),
  team_msgs AS (
    -- Mensagens da equipe
    SELECT 
      conversation_id,
      ts as team_ts
    FROM msgs 
    WHERE is_from_lead = false
  ),
  pairs AS (
    -- Para cada msg do lead, encontrar a próxima resposta da equipe
    SELECT 
      l.conversation_id,
      l.lead_ts,
      (
        SELECT MIN(t.team_ts)
        FROM team_msgs t
        WHERE t.conversation_id = l.conversation_id
          AND t.team_ts > l.lead_ts
          AND t.team_ts < l.lead_ts + interval '24 hours'
      ) as team_ts
    FROM lead_msgs l
  ),
  valid_pairs AS (
    SELECT 
      EXTRACT(EPOCH FROM (team_ts - lead_ts)) / 60 as response_minutes
    FROM pairs
    WHERE team_ts IS NOT NULL
  ),
  stats AS (
    SELECT 
      COUNT(*)::integer as total,
      ROUND(AVG(response_minutes), 2) as avg_min,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_minutes), 2) as median_min
    FROM valid_pairs
  )
  SELECT 
    COALESCE(total, 0),
    avg_min,
    median_min
  FROM stats;
END;
$$;