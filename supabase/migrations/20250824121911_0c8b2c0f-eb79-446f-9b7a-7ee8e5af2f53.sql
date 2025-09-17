-- Criar uma função que chama automaticamente o processador n8n
CREATE OR REPLACE FUNCTION public.process_n8n_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Chamar o edge function n8n-automation-processor
  PERFORM net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/n8n-automation-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('request.jwt.claim.token', true),
      'Content-Type', 'application/json'
    )
  );
END;
$$;