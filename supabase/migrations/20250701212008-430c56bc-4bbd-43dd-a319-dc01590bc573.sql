-- Adicionar política para permitir atualização de status de mensagens
CREATE POLICY "Service can update message status" ON whatsapp_messages
FOR UPDATE 
USING (true)
WITH CHECK (true);