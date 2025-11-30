-- Correção temporária de números de telefone incorretos
-- Adicionar o 9 em números de celular brasileiros com 12 dígitos

-- Corrigir número do Raniery (Goiás)
UPDATE whatsapp_conversations 
SET phone_number = '5562992591842'
WHERE phone_number = '556292591842';

-- Corrigir número do Valdir (Paraná)
UPDATE whatsapp_conversations 
SET phone_number = '5541997447722'
WHERE phone_number = '554197447722';

-- Verificar se há mais números com 12 dígitos que precisam ser corrigidos
-- (Opcional: executar isso para ver se há mais números incorretos)
-- SELECT phone_number, contact_name, workspace_id
-- FROM whatsapp_conversations
-- WHERE phone_number ~ '^55[0-9]{10}$'
-- ORDER BY created_at DESC;