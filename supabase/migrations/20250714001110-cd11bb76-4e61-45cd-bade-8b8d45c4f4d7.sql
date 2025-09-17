-- Create automation_flows table
CREATE TABLE public.automation_flows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  steps jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  send_once_per_lead boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  success_rate integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create automation_logs table
CREATE TABLE public.automation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  step_name text,
  status text NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  message_sent text,
  error_message text,
  executed_at timestamp with time zone DEFAULT now()
);

-- Create automation_executions table to track if a lead already received a flow
CREATE TABLE public.automation_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  executed_at timestamp with time zone DEFAULT now(),
  UNIQUE(flow_id, lead_id)
);

-- Enable RLS
ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_flows
CREATE POLICY "Users can manage automation flows in their workspace"
ON public.automation_flows
FOR ALL
USING (user_belongs_to_workspace(workspace_id));

-- RLS Policies for automation_logs
CREATE POLICY "Users can view automation logs in their workspace"
ON public.automation_logs
FOR SELECT
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Service can create automation logs"
ON public.automation_logs
FOR INSERT
WITH CHECK (true);

-- RLS Policies for automation_executions
CREATE POLICY "Users can view automation executions in their workspace"
ON public.automation_executions
FOR SELECT
USING (user_belongs_to_workspace(workspace_id));

CREATE POLICY "Service can manage automation executions"
ON public.automation_executions
FOR ALL
WITH CHECK (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_automation_flows_updated_at
BEFORE UPDATE ON public.automation_flows
FOR EACH ROW EXECUTE FUNCTION update_automation_flows_updated_at();