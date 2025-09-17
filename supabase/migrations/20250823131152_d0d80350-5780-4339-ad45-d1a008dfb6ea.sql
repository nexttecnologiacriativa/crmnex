-- Remover o trigger e função problemáticos que estão causando o erro "schema net does not exist"
DROP TRIGGER IF EXISTS lead_created_trigger ON leads;
DROP FUNCTION IF EXISTS handle_lead_created();