
-- Verificar se as políticas já existem e removê-las se necessário
DROP POLICY IF EXISTS "Users can view tag relations in their workspace" ON public.lead_tag_relations;
DROP POLICY IF EXISTS "Users can create tag relations in their workspace" ON public.lead_tag_relations;
DROP POLICY IF EXISTS "Users can delete tag relations in their workspace" ON public.lead_tag_relations;

-- Recriar as políticas com a estrutura correta
CREATE POLICY "Users can view tag relations in their workspace" 
  ON public.lead_tag_relations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE l.id = lead_tag_relations.lead_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tag relations in their workspace" 
  ON public.lead_tag_relations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE l.id = lead_tag_relations.lead_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tag relations in their workspace" 
  ON public.lead_tag_relations 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      JOIN public.workspace_members wm ON l.workspace_id = wm.workspace_id
      WHERE l.id = lead_tag_relations.lead_id 
      AND wm.user_id = auth.uid()
    )
  );
