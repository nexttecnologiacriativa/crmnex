-- Atualizar email do usuário de tech@next.com.br para tech@next.tec.br
UPDATE auth.users 
SET email = 'tech@next.tec.br',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"tech@next.tec.br"'
    )
WHERE email = 'tech@next.com.br';

-- Também atualizar na tabela profiles se existir
UPDATE public.profiles
SET email = 'tech@next.tec.br'
WHERE email = 'tech@next.com.br';