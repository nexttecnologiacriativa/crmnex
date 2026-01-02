-- Create meta_webhook_logs table for monitoring
CREATE TABLE public.meta_webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id uuid REFERENCES public.meta_integrations(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'leadgen',
  payload jsonb,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  leadgen_id text,
  form_id text,
  page_id text,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meta_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can access meta webhook logs through integration" 
ON public.meta_webhook_logs 
FOR ALL 
USING (
  integration_id IN (
    SELECT id FROM meta_integrations 
    WHERE user_has_workspace_access(workspace_id)
  )
);

-- Create index for faster queries
CREATE INDEX idx_meta_webhook_logs_integration_id ON public.meta_webhook_logs(integration_id);
CREATE INDEX idx_meta_webhook_logs_created_at ON public.meta_webhook_logs(created_at DESC);