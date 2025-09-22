-- Atualizar mensagens de áudio existentes para ter texto simplificado
UPDATE whatsapp_messages 
SET message_text = CASE 
  WHEN is_from_lead = true AND message_type = 'audio' THEN '[audio recebido]'
  WHEN is_from_lead = false AND message_type = 'audio' THEN '[audio enviado]'
  ELSE message_text
END
WHERE message_type = 'audio' AND (message_text NOT IN ('[audio recebido]', '[audio enviado]') OR message_text IS NULL);