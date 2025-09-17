-- Função para corrigir status de áudios enviados que foram marcados como failed incorretamente
CREATE OR REPLACE FUNCTION public.fix_audio_status()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE whatsapp_messages 
  SET status = 'sent' 
  WHERE message_type = 'audio' 
    AND is_from_lead = false 
    AND status = 'failed'
    AND media_url IS NOT NULL
    AND media_url LIKE '%lookaside.fbsbx.com%';
$$;