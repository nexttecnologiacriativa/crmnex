-- Create function to trigger n8n webhook when lead is created
CREATE OR REPLACE FUNCTION public.trigger_n8n_webhook_on_lead_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function asynchronously to send data to n8n
  PERFORM net.http_post(
    url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/lead-created-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire after lead insert
CREATE TRIGGER trigger_lead_created_n8n_webhook
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_n8n_webhook_on_lead_created();