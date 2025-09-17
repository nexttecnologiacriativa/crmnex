
-- Remover completamente o usuário icandaybr@gmail.com de todas as tabelas

-- Primeiro encontrar o user_id do usuário problemático
DO $$
DECLARE
    problematic_user_id uuid;
BEGIN
    -- Buscar o ID do usuário nas profiles
    SELECT id INTO problematic_user_id 
    FROM public.profiles 
    WHERE email = 'icandaybr@gmail.com' 
    LIMIT 1;
    
    IF problematic_user_id IS NOT NULL THEN
        -- Remover de todas as tabelas relacionadas
        DELETE FROM public.workspace_members WHERE user_id = problematic_user_id;
        DELETE FROM public.activities WHERE user_id = problematic_user_id;
        DELETE FROM public.lead_activities WHERE user_id = problematic_user_id;
        DELETE FROM public.tasks WHERE assigned_to = problematic_user_id OR created_by = problematic_user_id;
        DELETE FROM public.jobs WHERE assigned_to = problematic_user_id OR created_by = problematic_user_id;
        DELETE FROM public.job_comments WHERE user_id = problematic_user_id;
        DELETE FROM public.job_time_logs WHERE user_id = problematic_user_id;
        DELETE FROM public.whatsapp_messages WHERE sent_by = problematic_user_id;
        DELETE FROM public.whatsapp_templates WHERE created_by = problematic_user_id;
        DELETE FROM public.workspace_limits WHERE created_by = problematic_user_id;
        
        -- Remover o perfil por último
        DELETE FROM public.profiles WHERE id = problematic_user_id;
        
        RAISE NOTICE 'Usuario icandaybr@gmail.com removido completamente com ID: %', problematic_user_id;
    ELSE
        RAISE NOTICE 'Usuario icandaybr@gmail.com nao encontrado nas profiles';
    END IF;
END $$;

-- Também remover da tabela auth.users se ainda existir
DELETE FROM auth.users WHERE email = 'icandaybr@gmail.com';

-- Limpar workspaces órfãos (sem membros)
DELETE FROM public.workspaces 
WHERE id NOT IN (
    SELECT DISTINCT workspace_id 
    FROM public.workspace_members
);
