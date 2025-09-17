-- Remover a função problemática que está causando o erro "schema net does not exist"
DROP FUNCTION IF EXISTS public.trigger_n8n_webhook_on_lead_created() CASCADE;