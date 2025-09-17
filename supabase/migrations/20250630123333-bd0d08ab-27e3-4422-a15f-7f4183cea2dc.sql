
-- Add media support columns to whatsapp_messages table
ALTER TABLE public.whatsapp_messages 
ADD COLUMN media_url text,
ADD COLUMN media_type text,
ADD COLUMN attachment_name text;
