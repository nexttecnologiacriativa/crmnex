-- Create table for n8n webhooks by pipeline
CREATE TABLE public.n8n_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  webhook_url TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.n8n_webhooks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage n8n webhooks in their workspace" 
ON public.n8n_webhooks 
FOR ALL 
USING (user_belongs_to_workspace(workspace_id));

-- Create trigger for timestamps
CREATE TRIGGER update_n8n_webhooks_updated_at
BEFORE UPDATE ON public.n8n_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Update the trigger function to use the new table
CREATE OR REPLACE FUNCTION public.trigger_n8n_webhook_on_lead_created()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
BEGIN
  -- Loop through all active webhooks for this workspace and pipeline
  FOR webhook_record IN 
    SELECT webhook_url 
    FROM public.n8n_webhooks 
    WHERE workspace_id = NEW.workspace_id 
      AND pipeline_id = NEW.pipeline_id 
      AND is_active = true
  LOOP
    -- Call the edge function for each webhook
    PERFORM net.http_post(
      url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/lead-created-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'webhook_url', webhook_record.webhook_url
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;