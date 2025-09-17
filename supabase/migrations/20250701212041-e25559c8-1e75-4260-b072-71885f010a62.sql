-- Função para atualizar status de mensagens de áudio
CREATE OR REPLACE FUNCTION update_failed_audio_status()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE whatsapp_messages 
  SET status = 'sent' 
  WHERE message_type = 'audio' 
    AND status = 'failed' 
    AND is_from_lead = false;
$$;