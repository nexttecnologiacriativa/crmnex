-- Add column to track WhatsApp media ID for sent audio messages
-- This allows us to distinguish between sent audio (with media_id) and received audio (with media_url)
ALTER TABLE whatsapp_messages 
ADD COLUMN whatsapp_media_id TEXT;