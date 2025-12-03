-- Adicionar coluna para armazenar URL da foto de perfil do WhatsApp
ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS profile_picture_url text;