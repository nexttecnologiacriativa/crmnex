-- Limpar números existentes com sufixos
UPDATE whatsapp_conversations 
SET phone_number = normalize_phone_number(phone_number)
WHERE phone_number LIKE '%:%' 
   OR phone_number LIKE '%@%';

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_id ON whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_workspace_last_message ON whatsapp_conversations(workspace_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);