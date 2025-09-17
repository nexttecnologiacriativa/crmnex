
-- Remover o usuário icandaybr@gmail.com da tabela auth.users também
-- Isso vai remover completamente o usuário do sistema de autenticação

DELETE FROM auth.users WHERE email = 'icandaybr@gmail.com';
