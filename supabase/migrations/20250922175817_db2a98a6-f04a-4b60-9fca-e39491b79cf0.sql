-- Temporariamente atualizar as políticas RLS para debug e correção
-- Política mais permissiva para mensagens do WhatsApp (temporária)
DROP POLICY IF EXISTS "Users can access whatsapp messages through conversation" ON whatsapp_messages;
CREATE POLICY "Users can access whatsapp messages through conversation temp" ON whatsapp_messages
  FOR ALL USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN
        conversation_id IN (
          SELECT wc.id 
          FROM whatsapp_conversations wc
          JOIN workspace_members wm ON wc.workspace_id = wm.workspace_id
          WHERE wm.user_id = auth.uid()
        )
      ELSE false
    END
  );

-- Política mais permissiva para conversas do WhatsApp (temporária)  
DROP POLICY IF EXISTS "Users can access whatsapp conversations in their workspace" ON whatsapp_conversations;
CREATE POLICY "Users can access whatsapp conversations in their workspace temp" ON whatsapp_conversations
  FOR ALL USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN
        workspace_id IN (
          SELECT wm.workspace_id 
          FROM workspace_members wm
          WHERE wm.user_id = auth.uid()
        )
      ELSE false
    END
  );

-- Adicionar função de debug para verificar auth
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'auth_uid', auth.uid()::text,
    'auth_jwt', auth.jwt(),
    'current_timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;