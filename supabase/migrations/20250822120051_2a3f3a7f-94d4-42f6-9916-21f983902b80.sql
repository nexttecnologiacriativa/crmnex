-- Verificar se já existe trigger na tabela leads
DO $$
BEGIN
    -- Primeiro, vamos remover qualquer trigger existente para recriar corretamente
    DROP TRIGGER IF EXISTS lead_created_trigger ON leads;
    DROP FUNCTION IF EXISTS handle_lead_created();
    
    -- Criar a função que será chamada pelo trigger
    CREATE OR REPLACE FUNCTION handle_lead_created()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Chamar a edge function para processar o lead criado
        PERFORM net.http_post(
            url := 'https://rxpaaskbhbdirlxaavsm.supabase.co/functions/v1/lead-created-trigger',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'sub'
            ),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Criar o trigger que chama a função quando um lead é inserido
    CREATE TRIGGER lead_created_trigger
        AFTER INSERT ON leads
        FOR EACH ROW
        EXECUTE FUNCTION handle_lead_created();
        
    -- Dar as permissões necessárias
    GRANT EXECUTE ON FUNCTION handle_lead_created() TO authenticated;
    GRANT EXECUTE ON FUNCTION handle_lead_created() TO service_role;
    
END $$;