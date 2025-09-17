-- Adicionar coluna para salvar URL criptografada original
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS encrypted_media_url TEXT;

-- Criar índice único para message_id para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_messages_message_id 
ON whatsapp_messages (message_id) 
WHERE message_id IS NOT NULL;