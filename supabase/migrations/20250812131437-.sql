-- Add custom fields support to webhook messages table
ALTER TABLE public.whatsapp_webhook_messages 
ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- Add index for custom fields queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_messages_custom_fields 
ON public.whatsapp_webhook_messages USING GIN(custom_fields);