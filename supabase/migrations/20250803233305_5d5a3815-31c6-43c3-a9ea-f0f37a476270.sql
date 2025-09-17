-- Adicionar política de DELETE para whatsapp_instances
CREATE POLICY "Users can delete instances in their workspace" ON public.whatsapp_instances
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = whatsapp_instances.workspace_id 
    AND wm.user_id = auth.uid()
  ));