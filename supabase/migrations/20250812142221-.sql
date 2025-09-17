-- Verificar se a tabela whatsapp_sync_status existe
CREATE TABLE IF NOT EXISTS public.whatsapp_sync_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  instance_name TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_conversations INTEGER DEFAULT 0,
  processed_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  sync_options JSONB DEFAULT '{}',
  errors TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_sync_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view sync status for their workspace" 
ON public.whatsapp_sync_status 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert sync status for their workspace" 
ON public.whatsapp_sync_status 
FOR INSERT 
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sync status for their workspace" 
ON public.whatsapp_sync_status 
FOR UPDATE 
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_sync_status_updated_at
BEFORE UPDATE ON public.whatsapp_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();