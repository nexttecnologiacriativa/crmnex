-- Create table for Evolution API webhook messages
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  from_me BOOLEAN NOT NULL DEFAULT false,
  push_name TEXT,
  message_type TEXT NOT NULL,
  text TEXT,
  timestamp BIGINT NOT NULL,
  raw JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.whatsapp_webhook_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all data
CREATE POLICY "Service can manage webhook messages" ON public.whatsapp_webhook_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_messages_thread_id ON public.whatsapp_webhook_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_messages_timestamp ON public.whatsapp_webhook_messages(timestamp DESC);