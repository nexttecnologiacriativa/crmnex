-- Deletar workspace_members relacionados ao usuário problemático
DELETE FROM public.workspace_members 
WHERE user_id = '25766b58-ccf6-48f5-9f55-646addfd2ff0';

-- Deletar profile do usuário
DELETE FROM public.profiles 
WHERE id = '25766b58-ccf6-48f5-9f55-646addfd2ff0';

-- Deletar usuário do auth (isso vai cascatear outras deleções se necessário)
DELETE FROM auth.users 
WHERE id = '25766b58-ccf6-48f5-9f55-646addfd2ff0';