-- Create table for tracking WhatsApp sync status
CREATE TABLE IF NOT EXISTS public.whatsapp_sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  total_conversations INTEGER DEFAULT 0,
  processed_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  sync_options JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, instance_name)
);

-- Enable RLS
ALTER TABLE public.whatsapp_sync_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync status
CREATE POLICY "Users can view sync status in their workspace"
ON public.whatsapp_sync_status FOR SELECT
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can manage sync status in their workspace"
ON public.whatsapp_sync_status FOR ALL
USING (user_belongs_to_workspace(workspace_id));

-- Create function to update sync status updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_sync_status_updated_at
  BEFORE UPDATE ON public.whatsapp_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_sync_status_updated_at();

-- Improve whatsapp_webhook_messages table indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_messages_thread_id ON public.whatsapp_webhook_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_messages_timestamp ON public.whatsapp_webhook_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_messages_thread_timestamp ON public.whatsapp_webhook_messages(thread_id, timestamp DESC);

-- Add composite index for efficient conversation queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_workspace_phone ON public.whatsapp_conversations(workspace_id, phone_number);