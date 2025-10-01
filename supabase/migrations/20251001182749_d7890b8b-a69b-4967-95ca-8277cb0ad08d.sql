-- Migração para corrigir números de telefone duplicados e conversas
-- Identifica e corrige números com sufixos incorporados

-- Passo 1: Criar função temporária para normalizar números no banco
CREATE OR REPLACE FUNCTION temp_normalize_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits_only text;
  rest text;
BEGIN
  -- Remove suffixes após :
  phone := REGEXP_REPLACE(phone, ':[0-9]+$', '');
  
  -- Remove WhatsApp suffixes
  phone := REPLACE(phone, '@s.whatsapp.net', '');
  phone := REPLACE(phone, '@g.us', '');
  
  -- Remove todos caracteres não numéricos
  digits_only := REGEXP_REPLACE(phone, '[^0-9]', '', 'g');
  
  IF digits_only IS NULL OR digits_only = '' THEN
    RETURN '';
  END IF;
  
  -- Detectar e remover sufixos incorporados
  -- Se começa com 55 e tem mais de 13 dígitos
  IF digits_only LIKE '55%' AND LENGTH(digits_only) > 13 THEN
    -- Tentar remover últimos 2 dígitos
    IF LENGTH(SUBSTRING(digits_only, 1, LENGTH(digits_only) - 2)) = 13 THEN
      digits_only := SUBSTRING(digits_only, 1, LENGTH(digits_only) - 2);
    -- Tentar remover últimos 3 dígitos
    ELSIF LENGTH(SUBSTRING(digits_only, 1, LENGTH(digits_only) - 3)) = 13 THEN
      digits_only := SUBSTRING(digits_only, 1, LENGTH(digits_only) - 3);
    END IF;
  END IF;
  
  -- Processar DDI Brasil (55)
  IF digits_only LIKE '55%' THEN
    rest := SUBSTRING(digits_only, 3);
    -- Remover 0 após DDI se existir
    IF rest LIKE '0%' THEN
      rest := SUBSTRING(rest, 2);
    END IF;
    RETURN rest;
  END IF;
  
  -- Remover 0 inicial se existir
  IF digits_only LIKE '0%' THEN
    RETURN SUBSTRING(digits_only, 2);
  END IF;
  
  RETURN digits_only;
END;
$$;

-- Passo 2: Identificar conversas duplicadas baseado em números normalizados
WITH normalized_conversations AS (
  SELECT 
    id,
    phone_number,
    temp_normalize_phone(phone_number) as normalized,
    workspace_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, temp_normalize_phone(phone_number) 
      ORDER BY created_at ASC
    ) as rn
  FROM whatsapp_conversations
  WHERE temp_normalize_phone(phone_number) != ''
),
duplicates AS (
  SELECT 
    nc.id as duplicate_id,
    first.id as keep_id,
    nc.phone_number as duplicate_phone,
    first.phone_number as keep_phone
  FROM normalized_conversations nc
  INNER JOIN normalized_conversations first 
    ON nc.workspace_id = first.workspace_id 
    AND nc.normalized = first.normalized
    AND first.rn = 1
  WHERE nc.rn > 1
)
-- Migrar mensagens das conversas duplicadas para a conversa principal
UPDATE whatsapp_messages
SET conversation_id = d.keep_id
FROM duplicates d
WHERE whatsapp_messages.conversation_id = d.duplicate_id;

-- Passo 3: Remover conversas duplicadas (agora sem mensagens)
WITH normalized_conversations AS (
  SELECT 
    id,
    phone_number,
    temp_normalize_phone(phone_number) as normalized,
    workspace_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, temp_normalize_phone(phone_number) 
      ORDER BY created_at ASC
    ) as rn
  FROM whatsapp_conversations
  WHERE temp_normalize_phone(phone_number) != ''
)
DELETE FROM whatsapp_conversations
WHERE id IN (
  SELECT id 
  FROM normalized_conversations 
  WHERE rn > 1
);

-- Passo 4: Atualizar números de telefone para versão normalizada com DDI
UPDATE whatsapp_conversations
SET phone_number = '55' || temp_normalize_phone(phone_number)
WHERE temp_normalize_phone(phone_number) != ''
  AND LENGTH(temp_normalize_phone(phone_number)) = 11
  AND NOT phone_number LIKE '55%';

-- Passo 5: Recalcular message_count para as conversas mantidas
UPDATE whatsapp_conversations c
SET message_count = (
  SELECT COUNT(*)
  FROM whatsapp_messages m
  WHERE m.conversation_id = c.id
);

-- Passo 6: Limpar função temporária
DROP FUNCTION IF EXISTS temp_normalize_phone(text);

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE 'Migração de limpeza de números duplicados concluída';
END $$;