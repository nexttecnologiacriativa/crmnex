-- Enable realtime for whatsapp_messages table
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

-- Enable realtime for whatsapp_conversations table  
ALTER TABLE public.whatsapp_conversations REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;