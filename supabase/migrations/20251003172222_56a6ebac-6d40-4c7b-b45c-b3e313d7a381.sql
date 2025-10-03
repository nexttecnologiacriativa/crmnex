-- Verificar e corrigir a sessão do usuário
-- Primeiro, vamos garantir que o email_confirmed_at está definido
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'tech@next.tec.br' AND email_confirmed_at IS NULL;