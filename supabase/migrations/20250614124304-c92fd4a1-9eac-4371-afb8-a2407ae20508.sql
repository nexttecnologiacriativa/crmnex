
-- Remover políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Users can view job boards in their workspace" ON public.job_boards;
DROP POLICY IF EXISTS "Users can create job boards in their workspace" ON public.job_boards;
DROP POLICY IF EXISTS "Users can update job boards in their workspace" ON public.job_boards;
DROP POLICY IF EXISTS "Users can delete job boards in their workspace" ON public.job_boards;

-- Criar políticas RLS corretas para job_boards
CREATE POLICY "Users can view job boards in their workspace" ON public.job_boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = job_boards.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create job boards in their workspace" ON public.job_boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = job_boards.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update job boards in their workspace" ON public.job_boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = job_boards.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete job boards in their workspace" ON public.job_boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.workspace_id = job_boards.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );
