-- Adicionar ON DELETE CASCADE para foreign keys relacionadas a leads

-- lead_activities: deve ser excluído junto com o lead
ALTER TABLE lead_activities 
DROP CONSTRAINT IF EXISTS lead_activities_lead_id_fkey,
ADD CONSTRAINT lead_activities_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE CASCADE;

-- lead_pipeline_relations: deve ser excluído junto com o lead
ALTER TABLE lead_pipeline_relations 
DROP CONSTRAINT IF EXISTS lead_pipeline_relations_lead_id_fkey,
ADD CONSTRAINT lead_pipeline_relations_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE CASCADE;

-- lead_tag_relations: deve ser excluído junto com o lead
ALTER TABLE lead_tag_relations 
DROP CONSTRAINT IF EXISTS lead_tag_relations_lead_id_fkey,
ADD CONSTRAINT lead_tag_relations_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE CASCADE;

-- automation_logs: deve ser excluído junto com o lead
ALTER TABLE automation_logs 
DROP CONSTRAINT IF EXISTS automation_logs_lead_id_fkey,
ADD CONSTRAINT automation_logs_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE CASCADE;

-- tasks: manter a tarefa mas remover referência ao lead
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_lead_id_fkey,
ADD CONSTRAINT tasks_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE SET NULL;

-- whatsapp_conversations: manter conversa mas remover referência ao lead
ALTER TABLE whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_lead_id_fkey,
ADD CONSTRAINT whatsapp_conversations_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE SET NULL;

-- activities: manter atividade mas remover referência ao lead
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_lead_id_fkey,
ADD CONSTRAINT activities_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE SET NULL;

-- automation_queue: manter na fila mas remover referência ao lead
ALTER TABLE automation_queue 
DROP CONSTRAINT IF EXISTS automation_queue_lead_id_fkey,
ADD CONSTRAINT automation_queue_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE SET NULL;

-- campaign_recipients: manter registro mas remover referência ao lead
ALTER TABLE campaign_recipients 
DROP CONSTRAINT IF EXISTS campaign_recipients_lead_id_fkey,
ADD CONSTRAINT campaign_recipients_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE SET NULL;

-- marketing_campaign_recipients: manter registro mas remover referência ao lead
ALTER TABLE marketing_campaign_recipients 
DROP CONSTRAINT IF EXISTS marketing_campaign_recipients_lead_id_fkey,
ADD CONSTRAINT marketing_campaign_recipients_lead_id_fkey 
  FOREIGN KEY (lead_id) 
  REFERENCES leads(id) 
  ON DELETE SET NULL;