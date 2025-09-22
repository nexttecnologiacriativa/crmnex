-- Clear all WhatsApp conversations for workspace e15cbf15-2758-4af5-a1af-8fd3a641b778

-- First delete all messages
DELETE FROM whatsapp_messages 
WHERE conversation_id IN (
  SELECT id FROM whatsapp_conversations 
  WHERE workspace_id = 'e15cbf15-2758-4af5-a1af-8fd3a641b778'
);

-- Then delete all conversations
DELETE FROM whatsapp_conversations 
WHERE workspace_id = 'e15cbf15-2758-4af5-a1af-8fd3a641b778';