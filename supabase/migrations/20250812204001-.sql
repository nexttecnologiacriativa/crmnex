-- Verificar e corrigir configuração do bucket whatsapp-audio
-- Garantir que o bucket está público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'whatsapp-audio';

-- Criar políticas RLS para acesso público aos arquivos de áudio
DROP POLICY IF EXISTS "Áudios WhatsApp são acessíveis publicamente" ON storage.objects;
CREATE POLICY "Audios WhatsApp são acessiveis publicamente" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'whatsapp-audio');

-- Permitir inserção para usuários autenticados
DROP POLICY IF EXISTS "Usuários podem fazer upload de áudios WhatsApp" ON storage.objects;
CREATE POLICY "Usuarios podem fazer upload de audios WhatsApp" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'whatsapp-audio' AND auth.role() = 'authenticated');

-- Permitir atualização para usuários autenticados
DROP POLICY IF EXISTS "Usuários podem atualizar áudios WhatsApp" ON storage.objects;
CREATE POLICY "Usuarios podem atualizar audios WhatsApp" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'whatsapp-audio' AND auth.role() = 'authenticated');