
-- Create job_boards table first
CREATE TABLE public.job_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Now add board_id column to jobs table with reference
ALTER TABLE public.jobs ADD COLUMN board_id UUID REFERENCES public.job_boards(id) ON DELETE SET NULL;

-- Create job_subtasks table
CREATE TABLE public.job_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_time_logs table
CREATE TABLE public.job_time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  hours NUMERIC,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on job_boards
ALTER TABLE public.job_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job boards in their workspace" ON public.job_boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = job_boards.workspace_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create job boards in their workspace" ON public.job_boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = job_boards.workspace_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update job boards in their workspace" ON public.job_boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = job_boards.workspace_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete job boards in their workspace" ON public.job_boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = job_boards.workspace_id 
      AND user_id = auth.uid()
    )
  );

-- Enable RLS on job_subtasks
ALTER TABLE public.job_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job subtasks in their workspace" ON public.job_subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_subtasks.job_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create job subtasks in their workspace" ON public.job_subtasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_subtasks.job_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update job subtasks in their workspace" ON public.job_subtasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_subtasks.job_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete job subtasks in their workspace" ON public.job_subtasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_subtasks.job_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Enable RLS on job_time_logs
ALTER TABLE public.job_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view job time logs in their workspace" ON public.job_time_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_time_logs.job_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create job time logs in their workspace" ON public.job_time_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_time_logs.job_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update job time logs in their workspace" ON public.job_time_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_time_logs.job_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete job time logs in their workspace" ON public.job_time_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON j.workspace_id = wm.workspace_id
      WHERE j.id = job_time_logs.job_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_job_boards_updated_at
  BEFORE UPDATE ON public.job_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create default job board for existing workspaces
INSERT INTO public.job_boards (workspace_id, name, description, color, is_default)
SELECT id, 'Board Padrão', 'Board padrão para jobs', '#3b82f6', true
FROM public.workspaces
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_boards 
  WHERE workspace_id = workspaces.id AND is_default = true
);
