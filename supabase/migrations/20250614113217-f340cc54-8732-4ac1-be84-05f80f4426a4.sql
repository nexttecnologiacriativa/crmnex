
-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  estimated_hours NUMERIC,
  actual_hours NUMERIC
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view jobs in their workspace" ON public.jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = jobs.workspace_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create jobs in their workspace" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = jobs.workspace_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update jobs in their workspace" ON public.jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = jobs.workspace_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete jobs in their workspace" ON public.jobs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = jobs.workspace_id 
      AND user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
