-- Create Meta integrations table
CREATE TABLE public.meta_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  meta_app_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN NOT NULL DEFAULT true,
  selected_pipeline_id UUID NOT NULL,
  selected_tag_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Meta lead forms table
CREATE TABLE public.meta_lead_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  meta_form_id TEXT NOT NULL,
  form_name TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(integration_id, meta_form_id)
);

-- Enable RLS
ALTER TABLE public.meta_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_lead_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for meta_integrations
CREATE POLICY "Users can access meta integrations in their workspace" 
ON public.meta_integrations 
FOR ALL 
USING (user_has_workspace_access(workspace_id));

-- Create RLS policies for meta_lead_forms
CREATE POLICY "Users can access meta lead forms through integration" 
ON public.meta_lead_forms 
FOR ALL 
USING (integration_id IN (
  SELECT id FROM public.meta_integrations 
  WHERE user_has_workspace_access(workspace_id)
));

-- Create indexes
CREATE INDEX idx_meta_integrations_workspace_id ON public.meta_integrations(workspace_id);
CREATE INDEX idx_meta_integrations_meta_app_id ON public.meta_integrations(meta_app_id);
CREATE INDEX idx_meta_lead_forms_integration_id ON public.meta_lead_forms(integration_id);
CREATE INDEX idx_meta_lead_forms_meta_form_id ON public.meta_lead_forms(meta_form_id);

-- Create trigger for updated_at
CREATE TRIGGER update_meta_integrations_updated_at
  BEFORE UPDATE ON public.meta_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_lead_forms_updated_at
  BEFORE UPDATE ON public.meta_lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();