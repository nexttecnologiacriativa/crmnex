-- Criar tabela de configurações do Dashboard TV
CREATE TABLE IF NOT EXISTS public.tv_dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  revenue_goal NUMERIC DEFAULT 100000,
  show_utm_chart BOOLEAN DEFAULT true,
  show_funnel BOOLEAN DEFAULT true,
  show_leaderboard BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workspace_id)
);

-- Enable RLS
ALTER TABLE public.tv_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can access tv dashboard settings in their workspace"
  ON public.tv_dashboard_settings
  FOR ALL
  USING (user_has_workspace_access(workspace_id));

-- Create trigger for updated_at
CREATE TRIGGER update_tv_dashboard_settings_updated_at
  BEFORE UPDATE ON public.tv_dashboard_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();