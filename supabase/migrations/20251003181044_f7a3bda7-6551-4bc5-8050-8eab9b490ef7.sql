-- Corrigir email do usuário demo
UPDATE auth.users 
SET email = 'demo@next.tec.br',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"demo@next.tec.br"'
    )
WHERE email = 'demo@next.tech.br';

-- Atualizar também na tabela profiles se existir
UPDATE public.profiles 
SET email = 'demo@next.tec.br'
WHERE email = 'demo@next.tech.br';