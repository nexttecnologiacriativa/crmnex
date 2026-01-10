-- Lead Distribution Rules Table
CREATE TABLE public.lead_distribution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  
  -- Distribution mode
  distribution_mode text NOT NULL DEFAULT 'round_robin' CHECK (distribution_mode IN ('round_robin', 'percentage', 'least_loaded', 'fixed', 'weighted_random')),
  
  -- Application conditions
  apply_to_pipelines uuid[] DEFAULT '{}',
  apply_to_sources text[] DEFAULT '{}',
  apply_to_tags uuid[] DEFAULT '{}',
  exclude_tags uuid[] DEFAULT '{}',
  
  -- Active hours (optional)
  active_hours_start time,
  active_hours_end time,
  active_days integer[] DEFAULT '{1,2,3,4,5}',
  
  -- Control
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  last_assigned_index integer DEFAULT 0,
  fixed_user_id uuid REFERENCES auth.users(id),
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Lead Distribution Members Table
CREATE TABLE public.lead_distribution_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.lead_distribution_rules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Member settings
  percentage integer DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  weight integer DEFAULT 1,
  is_active boolean DEFAULT true,
  
  -- Limits
  max_leads_per_day integer,
  max_leads_per_hour integer,
  max_open_leads integer,
  
  -- Counters
  leads_assigned_today integer DEFAULT 0,
  leads_assigned_hour integer DEFAULT 0,
  last_assignment_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(rule_id, user_id)
);

-- Lead Distribution Logs Table
CREATE TABLE public.lead_distribution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.lead_distribution_rules(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  source text,
  pipeline_id uuid,
  distribution_mode text,
  reason text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Add fallback settings to workspace_settings
ALTER TABLE public.workspace_settings 
ADD COLUMN IF NOT EXISTS lead_distribution_fallback_mode text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS lead_distribution_fallback_user uuid REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE public.lead_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_distribution_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_distribution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_distribution_rules (using 'admin' role only)
CREATE POLICY "Users can view distribution rules in their workspace"
ON public.lead_distribution_rules FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage distribution rules"
ON public.lead_distribution_rules FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for lead_distribution_members
CREATE POLICY "Users can view distribution members in their workspace"
ON public.lead_distribution_members FOR SELECT
USING (
  rule_id IN (
    SELECT id FROM public.lead_distribution_rules 
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage distribution members"
ON public.lead_distribution_members FOR ALL
USING (
  rule_id IN (
    SELECT id FROM public.lead_distribution_rules 
    WHERE workspace_id IN (
      SELECT workspace_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- RLS Policies for lead_distribution_logs
CREATE POLICY "Users can view distribution logs in their workspace"
ON public.lead_distribution_logs FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert distribution logs"
ON public.lead_distribution_logs FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_distribution_rules_workspace ON public.lead_distribution_rules(workspace_id);
CREATE INDEX idx_distribution_rules_active ON public.lead_distribution_rules(workspace_id, is_active, priority DESC);
CREATE INDEX idx_distribution_members_rule ON public.lead_distribution_members(rule_id);
CREATE INDEX idx_distribution_members_user ON public.lead_distribution_members(user_id);
CREATE INDEX idx_distribution_logs_workspace ON public.lead_distribution_logs(workspace_id, created_at DESC);
CREATE INDEX idx_distribution_logs_lead ON public.lead_distribution_logs(lead_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_lead_distribution_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_distribution_rules_timestamp
BEFORE UPDATE ON public.lead_distribution_rules
FOR EACH ROW EXECUTE FUNCTION update_lead_distribution_rules_updated_at();