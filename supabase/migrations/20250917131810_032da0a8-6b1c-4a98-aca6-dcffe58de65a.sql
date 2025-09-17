-- Create table for AI insights cache
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  insights_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '6 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view insights cache in their workspace" 
ON public.ai_insights_cache 
FOR SELECT 
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can insert insights cache in their workspace" 
ON public.ai_insights_cache 
FOR INSERT 
WITH CHECK (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Users can update insights cache in their workspace" 
ON public.ai_insights_cache 
FOR UPDATE 
USING (user_belongs_to_workspace(workspace_id));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_workspace_expires 
ON public.ai_insights_cache(workspace_id, expires_at);

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_ai_insights()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.ai_insights_cache 
  WHERE expires_at < now();
$$;