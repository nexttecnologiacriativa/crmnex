-- Adicionar coluna para forçar reset de senha
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false;

-- Adicionar comentário explicando o campo
COMMENT ON COLUMN public.profiles.password_reset_required IS 'Quando true, o usuário será forçado a redefinir sua senha no próximo login';