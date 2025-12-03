-- Adicionar coluna para armazenar transcrição de áudio
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS audio_transcription TEXT;