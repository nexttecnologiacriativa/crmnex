-- 1. Remover conversas de grupos existentes
DELETE FROM whatsapp_conversations 
WHERE phone_number LIKE '%@g.us%';

-- 2. Limpar números com formatação incorreta (remover sufixos após :)
UPDATE whatsapp_conversations 
SET phone_number = REGEXP_REPLACE(phone_number, ':[0-9]+$', '')
WHERE phone_number ~ ':[0-9]+$';

-- 3. Normalizar todos os números para formato consistente (remover caracteres não numéricos exceto +)
UPDATE whatsapp_conversations 
SET phone_number = REGEXP_REPLACE(phone_number, '[^0-9+]', '', 'g')
WHERE phone_number ~ '[^0-9+@]';

-- 4. Mesclar conversas duplicadas (manter a mais recente)
WITH duplicates AS (
  SELECT 
    phone_number,
    workspace_id,
    array_agg(id ORDER BY last_message_at DESC, created_at DESC) as conversation_ids
  FROM whatsapp_conversations
  WHERE phone_number NOT LIKE '%@%'
  GROUP BY phone_number, workspace_id
  HAVING COUNT(*) > 1
)
UPDATE whatsapp_messages wm
SET conversation_id = d.conversation_ids[1]
FROM duplicates d
WHERE wm.conversation_id = ANY(d.conversation_ids[2:]);

-- 5. Deletar conversas duplicadas (mantendo apenas a mais recente)
WITH duplicates AS (
  SELECT 
    phone_number,
    workspace_id,
    array_agg(id ORDER BY last_message_at DESC, created_at DESC) as conversation_ids
  FROM whatsapp_conversations
  WHERE phone_number NOT LIKE '%@%'
  GROUP BY phone_number, workspace_id
  HAVING COUNT(*) > 1
)
DELETE FROM whatsapp_conversations
WHERE id IN (
  SELECT unnest(conversation_ids[2:])
  FROM duplicates
);

-- 6. Adicionar constraint UNIQUE para prevenir duplicatas futuras
ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT unique_phone_workspace UNIQUE (phone_number, workspace_id);

-- 7. Criar índice para melhorar performance de buscas por telefone
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone 
ON whatsapp_conversations(phone_number);

-- 8. Criar função para normalizar telefones
CREATE OR REPLACE FUNCTION normalize_phone_number(phone TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Remove sufixos após : (ex: :57)
  phone := REGEXP_REPLACE(phone, ':[0-9]+$', '');
  
  -- Remove @s.whatsapp.net se existir
  phone := REPLACE(phone, '@s.whatsapp.net', '');
  
  -- Remove todos os caracteres não numéricos
  phone := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
  
  RETURN phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;