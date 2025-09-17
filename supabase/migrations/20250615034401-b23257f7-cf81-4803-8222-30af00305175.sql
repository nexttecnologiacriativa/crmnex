
-- Remover completamente o usuário icandaybr@gmail.com de todas as tabelas
-- Incluindo uma limpeza mais completa

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
        RAISE NOTICE 'Encontrado usuário problemático com ID: %', problematic_user_id;
        
        -- Remover de todas as tabelas relacionadas em ordem correta
        DELETE FROM public.job_time_logs WHERE user_id = problematic_user_id;
        DELETE FROM public.job_comments WHERE user_id = problematic_user_id;
        DELETE FROM public.lead_activities WHERE user_id = problematic_user_id;
        DELETE FROM public.activities WHERE user_id = problematic_user_id;
        DELETE FROM public.whatsapp_messages WHERE sent_by = problematic_user_id;
        DELETE FROM public.whatsapp_templates WHERE created_by = problematic_user_id;
        DELETE FROM public.workspace_limits WHERE created_by = problematic_user_id;
        
        -- Remover tasks onde é assigned_to ou created_by
        DELETE FROM public.tasks WHERE assigned_to = problematic_user_id;
        DELETE FROM public.tasks WHERE created_by = problematic_user_id;
        
        -- Remover jobs onde é assigned_to ou created_by
        DELETE FROM public.jobs WHERE assigned_to = problematic_user_id;
        DELETE FROM public.jobs WHERE created_by = problematic_user_id;
        
        -- Remover leads onde é assigned_to
        DELETE FROM public.leads WHERE assigned_to = problematic_user_id;
        
        -- Remover pipelines onde é default_assignee
        UPDATE public.pipelines SET default_assignee = NULL WHERE default_assignee = problematic_user_id;
        
        -- Remover de account_status onde é suspended_by
        UPDATE public.account_status SET suspended_by = NULL WHERE suspended_by = problematic_user_id;
        
        -- Remover de workspace_members (isso pode deixar workspaces órfãos)
        DELETE FROM public.workspace_members WHERE user_id = problematic_user_id;
        
        -- Remover workspaces onde é owner (se existir)
        DELETE FROM public.workspaces WHERE owner_id = problematic_user_id;
        
        -- Remover o perfil por último
        DELETE FROM public.profiles WHERE id = problematic_user_id;
        
        RAISE NOTICE 'Usuario icandaybr@gmail.com removido completamente com ID: %', problematic_user_id;
    ELSE
        RAISE NOTICE 'Usuario icandaybr@gmail.com nao encontrado nas profiles';
    END IF;
END $$;

-- Tentar remover da tabela auth.users também (pode falhar se não existir)
DO $$
BEGIN
    DELETE FROM auth.users WHERE email = 'icandaybr@gmail.com';
    RAISE NOTICE 'Usuario removido da tabela auth.users';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover da auth.users (pode não existir): %', SQLERRM;
END $$;

-- Limpar workspaces órfãos (sem membros)
DELETE FROM public.workspaces 
WHERE id NOT IN (
    SELECT DISTINCT workspace_id 
    FROM public.workspace_members
    WHERE workspace_id IS NOT NULL
);

-- Verificar se ainda existem referências
DO $$
DECLARE
    ref_count integer;
BEGIN
    -- Verificar se ainda há referências ao email
    SELECT COUNT(*) INTO ref_count FROM (
        SELECT 1 FROM public.profiles WHERE email = 'icandaybr@gmail.com'
        UNION ALL
        SELECT 1 FROM public.workspace_members wm 
        JOIN public.profiles p ON wm.user_id = p.id 
        WHERE p.email = 'icandaybr@gmail.com'
    ) AS refs;
    
    IF ref_count > 0 THEN
        RAISE NOTICE 'AVISO: Ainda existem % referências ao usuário icandaybr@gmail.com', ref_count;
    ELSE
        RAISE NOTICE 'SUCESSO: Nenhuma referência encontrada para icandaybr@gmail.com';
    END IF;
END $$;
