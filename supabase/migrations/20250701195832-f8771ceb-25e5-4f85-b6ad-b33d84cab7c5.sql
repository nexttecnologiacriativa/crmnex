-- Adicionar política RLS para permitir delete de conversas WhatsApp
CREATE POLICY "Users can delete conversations in their workspace" 
ON public.whatsapp_conversations 
FOR DELETE 
USING (user_belongs_to_workspace(workspace_id));