-- Add OpenAI API key field to workspace_settings table
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS openai_api_key TEXT;