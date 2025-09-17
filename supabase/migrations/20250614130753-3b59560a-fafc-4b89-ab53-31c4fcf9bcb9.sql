
-- Adicionar políticas RLS completas para job_boards
CREATE POLICY "job_boards_insert" ON public.job_boards
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "job_boards_update" ON public.job_boards
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "job_boards_delete" ON public.job_boards
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

-- Adicionar políticas RLS completas para jobs
CREATE POLICY "jobs_insert" ON public.jobs
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "jobs_update" ON public.jobs
  FOR UPDATE USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

CREATE POLICY "jobs_delete" ON public.jobs
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
  );

-- Adicionar políticas RLS para job_subtasks
CREATE POLICY "job_subtasks_select" ON public.job_subtasks
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

CREATE POLICY "job_subtasks_insert" ON public.job_subtasks
  FOR INSERT WITH CHECK (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

CREATE POLICY "job_subtasks_update" ON public.job_subtasks
  FOR UPDATE USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

CREATE POLICY "job_subtasks_delete" ON public.job_subtasks
  FOR DELETE USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

-- Adicionar políticas RLS para job_time_logs
CREATE POLICY "job_time_logs_select" ON public.job_time_logs
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

CREATE POLICY "job_time_logs_insert" ON public.job_time_logs
  FOR INSERT WITH CHECK (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

CREATE POLICY "job_time_logs_update" ON public.job_time_logs
  FOR UPDATE USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );

CREATE POLICY "job_time_logs_delete" ON public.job_time_logs
  FOR DELETE USING (
    job_id IN (
      SELECT id FROM public.jobs 
      WHERE workspace_id IN (SELECT workspace_id FROM public.get_user_workspaces())
    )
  );
