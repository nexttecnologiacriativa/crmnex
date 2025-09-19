-- Atualizar as configurações do workspace "Meu Workspace" para incluir a chave OpenAI
UPDATE workspace_settings 
SET openai_api_key = 'configured'
WHERE workspace_id = 'e27a23c2-eb8c-4e69-8a91-e4bb12f50b4d';