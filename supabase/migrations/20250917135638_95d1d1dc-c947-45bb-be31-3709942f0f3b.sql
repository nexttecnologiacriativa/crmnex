-- Add ai_insights_pipeline_ids column to workspace_settings table
ALTER TABLE public.workspace_settings 
ADD COLUMN ai_insights_pipeline_ids uuid[] DEFAULT NULL;

-- Add comment for the new column
COMMENT ON COLUMN public.workspace_settings.ai_insights_pipeline_ids IS 'Array of pipeline IDs to include in AI insights analysis. If NULL, all pipelines are included.';