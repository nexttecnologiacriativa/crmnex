-- Add form-specific tags and field mapping columns to meta_lead_forms
ALTER TABLE public.meta_lead_forms
ADD COLUMN IF NOT EXISTS selected_tag_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS field_mapping JSONB DEFAULT '{}';