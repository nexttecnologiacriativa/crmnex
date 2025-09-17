-- Add n8n webhook URL column to workspace_settings
ALTER TABLE public.workspace_settings 
ADD COLUMN n8n_webhook_url TEXT;