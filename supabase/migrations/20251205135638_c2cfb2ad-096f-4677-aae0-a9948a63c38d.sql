-- Desabilitar TODOS os triggers de usuário temporariamente
ALTER TABLE leads DISABLE TRIGGER USER;

-- Atualizar os leads
UPDATE leads 
SET assigned_to = '74828cd5-af8c-4cdb-8e28-7029ed584d77',
    updated_at = NOW()
WHERE workspace_id = 'e15cbf15-2758-4af5-a1af-8fd3a641b778';

-- Reabilitar triggers
ALTER TABLE leads ENABLE TRIGGER USER;