-- Corrigir número do Rodrigo (Insígnia) - Alagoas
-- Adicionar o 9 que está faltando no número de celular
UPDATE whatsapp_conversations 
SET phone_number = '5582996281910'
WHERE phone_number = '558296281910'
AND workspace_id = '93f1496d-d366-4b57-8324-d470c3df8b0d';