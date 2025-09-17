-- 1. Remove the unique constraint on lead_tags name that is causing issues
-- This constraint prevents different workspaces from having tags with the same name
DROP INDEX IF EXISTS lead_tags_name_key;
ALTER TABLE public.lead_tags DROP CONSTRAINT IF EXISTS lead_tags_name_key;

-- 2. Create a unique constraint on name per workspace instead
-- This allows different workspaces to have tags with the same name
CREATE UNIQUE INDEX lead_tags_name_workspace_unique 
ON public.lead_tags (name, workspace_id) 
WHERE workspace_id IS NOT NULL;

-- 3. For global tags (workspace_id IS NULL), still maintain uniqueness
CREATE UNIQUE INDEX lead_tags_name_global_unique 
ON public.lead_tags (name) 
WHERE workspace_id IS NULL;