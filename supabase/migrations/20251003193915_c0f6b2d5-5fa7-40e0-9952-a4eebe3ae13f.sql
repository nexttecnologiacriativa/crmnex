-- Remover a constraint existente se ela existir
ALTER TABLE lead_activities 
DROP CONSTRAINT IF EXISTS lead_activities_lead_id_fkey;

-- Adicionar a nova constraint com ON DELETE CASCADE
ALTER TABLE lead_activities 
ADD CONSTRAINT lead_activities_lead_id_fkey 
FOREIGN KEY (lead_id) 
REFERENCES leads(id) 
ON DELETE CASCADE;