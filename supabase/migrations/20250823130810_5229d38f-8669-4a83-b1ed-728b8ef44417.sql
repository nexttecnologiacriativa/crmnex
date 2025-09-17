-- Verificar e recriar apenas o trigger necessário para n8n sem afetar os webhooks normais
-- O webhook-receiver funciona diretamente via URL e não precisa de triggers

-- Primeiro, verificar se o trigger já existe
DROP TRIGGER IF EXISTS lead_created_trigger ON leads;

-- Recriar apenas o trigger para n8n, mantendo compatibilidade com webhooks normais
CREATE TRIGGER lead_created_trigger
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION handle_lead_created();

-- Verificar se a função handle_lead_created existe e está correta
-- A função já deve ter sido criada na migration anterior