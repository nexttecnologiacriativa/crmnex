-- Verificar se o bucket whatsapp-media existe e criar se necessário
INSERT INTO storage.buckets (id, name, public) 
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Criar policies para o bucket whatsapp-media
CREATE POLICY "Users can access whatsapp media in their workspace" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'whatsapp-media' AND 
       (storage.foldername(name))[1]::uuid IN (
         SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
       ));

-- Garantir que a coluna media_type existe na tabela whatsapp_messages
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS media_type text;