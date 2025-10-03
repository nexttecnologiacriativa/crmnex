-- Remover coluna openai_api_key da tabela workspace_settings
-- A API key agora será um secret global do Supabase (OPENAI_API_KEY)
ALTER TABLE workspace_settings DROP COLUMN IF EXISTS openai_api_key;